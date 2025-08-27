from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    level: int
    xp: int
    xp_to_next_level: int
    strength: int
    agility: int
    stamina: int
    vitality: int
    total_quests_completed: int
    total_workouts: int
    current_streak: int
    avatar_tier: str
    created_at: datetime

class QuestCreate(BaseModel):
    quest_type: str
    title: str
    description: str
    exercise_type: str
    target_value: int
    xp_reward: int
    gold_reward: int
    item_reward: Optional[str] = None

class Quest(BaseModel):
    id: str
    user_id: str
    quest_type: str
    title: str
    description: str
    exercise_type: str
    target_value: int
    current_progress: int
    xp_reward: int
    gold_reward: int
    item_reward: Optional[str]
    status: str
    created_at: datetime
    expires_at: datetime

class WorkoutLog(BaseModel):
    exercise_type: str
    value: int
    notes: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# Achievement Models
class Achievement(BaseModel):
    id: str
    name: str
    description: str
    category: str
    requirement_type: str
    requirement_value: int
    xp_reward: int
    gold_reward: int
    icon: str
    rarity: str
    created_at: datetime

class UserAchievement(BaseModel):
    id: str
    user_id: str
    achievement_id: str
    unlocked_at: datetime
    current_progress: int
    completed: bool

# Settings Models
class UserSettings(BaseModel):
    notification_quest_reminders: bool = True
    notification_level_up: bool = True
    notification_achievement_unlock: bool = True
    privacy_profile_visible: bool = True
    privacy_stats_visible: bool = True
    app_theme: str = "dark"
    app_units: str = "metric"
    app_language: str = "en"

class SettingsUpdate(BaseModel):
    notification_quest_reminders: Optional[bool] = None
    notification_level_up: Optional[bool] = None
    notification_achievement_unlock: Optional[bool] = None
    privacy_profile_visible: Optional[bool] = None
    privacy_stats_visible: Optional[bool] = None
    app_theme: Optional[str] = None
    app_units: Optional[str] = None
    app_language: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def calculate_xp_for_level(level: int) -> int:
    """Calculate XP required for a specific level (exponential growth)"""
    return int(100 * (1.5 ** (level - 1)))

def calculate_level_from_xp(total_xp: int) -> tuple[int, int]:
    """Calculate current level and XP to next level from total XP"""
    level = 1
    while True:
        xp_needed = calculate_xp_for_level(level)
        if total_xp < xp_needed:
            break
        total_xp -= xp_needed
        level += 1
    
    xp_to_next = calculate_xp_for_level(level) - total_xp
    return level, xp_to_next

def get_avatar_tier(level: int) -> str:
    """Determine avatar tier based on level"""
    if level >= 50:
        return "Shadow"
    elif level >= 30:
        return "Diamond" 
    elif level >= 20:
        return "Gold"
    elif level >= 10:
        return "Silver"
    else:
        return "Bronze"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user with RPG stats
    hashed_password = hash_password(user_data.password)
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow(),
        
        # RPG Stats
        "level": 1,
        "total_xp": 0,
        "xp_to_next_level": 100,
        
        # Character Stats (base stats)
        "strength": 10,
        "agility": 10,
        "stamina": 10,
        "vitality": 10,
        
        # Progression
        "total_quests_completed": 0,
        "total_workouts": 0,
        "current_streak": 0,
        "avatar_tier": "Bronze"
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create default settings for new user
    await create_user_settings(ObjectId(user_id))
    
    # Generate daily quests for new user
    await generate_daily_quests(user_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    return Token(access_token=access_token, token_type="bearer")

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(user['_id'])})
    return Token(access_token=access_token, token_type="bearer")

# User Routes
@api_router.get("/user/profile", response_model=UserResponse)
async def get_profile(current_user = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user['_id']),
        username=current_user['username'],
        email=current_user['email'],
        level=current_user['level'],
        xp=current_user.get('total_xp', 0),
        xp_to_next_level=current_user['xp_to_next_level'],
        strength=current_user['strength'],
        agility=current_user['agility'],
        stamina=current_user['stamina'],
        vitality=current_user['vitality'],
        total_quests_completed=current_user['total_quests_completed'],
        total_workouts=current_user['total_workouts'],
        current_streak=current_user['current_streak'],
        avatar_tier=current_user['avatar_tier'],
        created_at=current_user['created_at']
    )

# Quest Generation Helper
async def generate_daily_quests(user_id: str):
    """Generate daily quests for a user"""
    
    # Clear existing daily quests
    await db.quests.delete_many({
        "user_id": ObjectId(user_id),
        "quest_type": "daily",
        "status": "active"
    })
    
    # Quest templates
    quest_templates = [
        {
            "title": "🔥 Push Your Limits",
            "description": "Complete 20 push-ups to build your strength",
            "exercise_type": "push_ups",
            "target_value": 20,
            "xp_reward": 50,
            "gold_reward": 25
        },
        {
            "title": "💧 Hydration Hunter", 
            "description": "Drink 8 glasses of water to maintain your vitality",
            "exercise_type": "water_intake",
            "target_value": 8,
            "xp_reward": 30,
            "gold_reward": 15
        },
        {
            "title": "🏃‍♂️ Speed Demon",
            "description": "Run 2 miles to increase your agility",
            "exercise_type": "running",
            "target_value": 2,
            "xp_reward": 75,
            "gold_reward": 40
        },
        {
            "title": "💪 Core Crusher",
            "description": "Do 30 sit-ups to strengthen your core",
            "exercise_type": "sit_ups", 
            "target_value": 30,
            "xp_reward": 45,
            "gold_reward": 20
        },
        {
            "title": "🏋️ Iron Will",
            "description": "Complete a 30-minute workout session",
            "exercise_type": "gym_session",
            "target_value": 30,
            "xp_reward": 100,
            "gold_reward": 50
        }
    ]
    
    # Create 3 random daily quests
    import random
    selected_quests = random.sample(quest_templates, 3)
    
    quest_docs = []
    for template in selected_quests:
        quest_doc = {
            "user_id": ObjectId(user_id),
            "quest_type": "daily",
            "title": template["title"],
            "description": template["description"],
            "exercise_type": template["exercise_type"],
            "target_value": template["target_value"],
            "current_progress": 0,
            "xp_reward": template["xp_reward"],
            "gold_reward": template["gold_reward"],
            "item_reward": None,
            "status": "active",
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=1)
        }
        quest_docs.append(quest_doc)
    
    await db.quests.insert_many(quest_docs)

# Quest Routes
@api_router.get("/quests", response_model=List[Quest])
async def get_quests(current_user = Depends(get_current_user)):
    quests = await db.quests.find({
        "user_id": current_user['_id'],
        "status": "active"
    }).to_list(100)
    
    quest_list = []
    for quest in quests:
        quest_list.append(Quest(
            id=str(quest['_id']),
            user_id=str(quest['user_id']),
            quest_type=quest['quest_type'],
            title=quest['title'],
            description=quest['description'],
            exercise_type=quest['exercise_type'],
            target_value=quest['target_value'],
            current_progress=quest['current_progress'],
            xp_reward=quest['xp_reward'],
            gold_reward=quest['gold_reward'],
            item_reward=quest.get('item_reward'),
            status=quest['status'],
            created_at=quest['created_at'],
            expires_at=quest['expires_at']
        ))
    
    return quest_list

@api_router.post("/quests/daily/generate")
async def generate_new_daily_quests(current_user = Depends(get_current_user)):
    """Generate new daily quests (can be called manually or on schedule)"""
    await generate_daily_quests(str(current_user['_id']))
    return {"message": "Daily quests generated successfully"}

# Workout Routes
@api_router.post("/workouts/log")
async def log_workout(workout: WorkoutLog, quest_id: str, current_user = Depends(get_current_user)):
    """Log a workout and update quest progress"""
    
    # Find the quest
    quest = await db.quests.find_one({
        "_id": ObjectId(quest_id),
        "user_id": current_user['_id'],
        "status": "active"
    })
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    # Update quest progress
    new_progress = min(quest['current_progress'] + workout.value, quest['target_value'])
    quest_completed = new_progress >= quest['target_value']
    
    # Update quest in database
    update_data = {"current_progress": new_progress}
    if quest_completed:
        update_data["status"] = "completed"
    
    await db.quests.update_one(
        {"_id": ObjectId(quest_id)},
        {"$set": update_data}
    )
    
    # If quest completed, reward user
    if quest_completed:
        await reward_user(current_user['_id'], quest['xp_reward'], quest['gold_reward'])
    
    # Log the workout
    workout_doc = {
        "user_id": current_user['_id'],
        "quest_id": ObjectId(quest_id),
        "exercise_type": workout.exercise_type,
        "value": workout.value,
        "notes": workout.notes,
        "logged_at": datetime.utcnow()
    }
    await db.workout_logs.insert_one(workout_doc)
    
    return {
        "message": "Workout logged successfully",
        "quest_completed": quest_completed,
        "new_progress": new_progress,
        "target": quest['target_value']
    }

async def reward_user(user_id: ObjectId, xp_reward: int, gold_reward: int):
    """Reward user with XP and update their stats"""
    user = await db.users.find_one({"_id": user_id})
    
    # Update XP and calculate new level
    new_total_xp = user.get('total_xp', 0) + xp_reward
    new_level, xp_to_next = calculate_level_from_xp(new_total_xp)
    
    # Check if leveled up
    level_up = new_level > user['level']
    
    update_data = {
        "total_xp": new_total_xp,
        "level": new_level,
        "xp_to_next_level": xp_to_next,
        "total_quests_completed": user['total_quests_completed'] + 1,
        "avatar_tier": get_avatar_tier(new_level)
    }
    
    # If leveled up, increase stats
    if level_up:
        update_data.update({
            "strength": user['strength'] + 2,
            "agility": user['agility'] + 2,
            "stamina": user['stamina'] + 2,
            "vitality": user['vitality'] + 2
        })
    
    await db.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    
    # Check for newly unlocked achievements
    updated_user = await db.users.find_one({"_id": user_id})
    newly_unlocked = await check_user_achievements(user_id, updated_user)
    
    return newly_unlocked

# Achievement System Functions
async def initialize_achievements():
    """Initialize default achievements in the database"""
    achievements = [
        # Workout Achievements
        {
            "name": "First Steps",
            "description": "Complete your first workout",
            "category": "workout",
            "requirement_type": "total_workouts",
            "requirement_value": 1,
            "xp_reward": 50,
            "gold_reward": 25,
            "icon": "footsteps",
            "rarity": "common",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Push-up Champion",
            "description": "Complete 100 push-ups in total",
            "category": "exercise",
            "requirement_type": "push_ups_total",
            "requirement_value": 100,
            "xp_reward": 100,
            "gold_reward": 50,
            "icon": "fitness",
            "rarity": "rare",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Marathon Runner",
            "description": "Run a total of 26 miles",
            "category": "exercise",
            "requirement_type": "running_total",
            "requirement_value": 26,
            "xp_reward": 200,
            "gold_reward": 100,
            "icon": "walk",
            "rarity": "epic",
            "created_at": datetime.utcnow()
        },
        
        # Quest Achievements
        {
            "name": "Quest Rookie",
            "description": "Complete 10 quests",
            "category": "quest",
            "requirement_type": "total_quests_completed",
            "requirement_value": 10,
            "xp_reward": 75,
            "gold_reward": 40,
            "icon": "trophy",
            "rarity": "common",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Streak Master",
            "description": "Maintain a 7-day quest completion streak",
            "category": "streak",
            "requirement_type": "current_streak",
            "requirement_value": 7,
            "xp_reward": 150,
            "gold_reward": 75,
            "icon": "flame",
            "rarity": "rare",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Dedicated Hunter",
            "description": "Complete 50 quests",
            "category": "quest",
            "requirement_type": "total_quests_completed",
            "requirement_value": 50,
            "xp_reward": 250,
            "gold_reward": 125,
            "icon": "medal",
            "rarity": "epic",
            "created_at": datetime.utcnow()
        },
        
        # Level Achievements
        {
            "name": "Novice Hunter",
            "description": "Reach level 5",
            "category": "level",
            "requirement_type": "level",
            "requirement_value": 5,
            "xp_reward": 100,
            "gold_reward": 50,
            "icon": "shield",
            "rarity": "common",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Elite Hunter",
            "description": "Reach level 20",
            "category": "level",
            "requirement_type": "level",
            "requirement_value": 20,
            "xp_reward": 300,
            "gold_reward": 150,
            "icon": "star",
            "rarity": "epic",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Shadow Monarch",
            "description": "Reach level 50 and unlock Shadow tier",
            "category": "level",
            "requirement_type": "level",
            "requirement_value": 50,
            "xp_reward": 1000,
            "gold_reward": 500,
            "icon": "flash",
            "rarity": "legendary",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Check if achievements already exist
    existing_achievements = await db.achievements.count_documents({})
    if existing_achievements == 0:
        await db.achievements.insert_many(achievements)
        print("✅ Achievements initialized in database")

async def check_user_achievements(user_id: ObjectId, user_data: dict):
    """Check and unlock achievements for a user"""
    # Get all achievements
    all_achievements = await db.achievements.find({}).to_list(1000)
    
    # Get user's current achievements
    user_achievements = await db.user_achievements.find({
        "user_id": user_id
    }).to_list(1000)
    
    completed_achievement_ids = {ua["achievement_id"] for ua in user_achievements if ua["completed"]}
    
    newly_unlocked = []
    
    for achievement in all_achievements:
        achievement_id = achievement["_id"]
        if achievement_id in completed_achievement_ids:
            continue
            
        # Check if user meets requirement
        requirement_type = achievement["requirement_type"]
        requirement_value = achievement["requirement_value"]
        current_value = 0
        
        if requirement_type == "total_workouts":
            current_value = user_data.get("total_workouts", 0)
        elif requirement_type == "total_quests_completed":
            current_value = user_data.get("total_quests_completed", 0)
        elif requirement_type == "current_streak":
            current_value = user_data.get("current_streak", 0)
        elif requirement_type == "level":
            current_value = user_data.get("level", 1)
        elif requirement_type in ["push_ups_total", "running_total"]:
            # Get exercise totals from workout logs
            pipeline = [
                {"$match": {"user_id": user_id, "exercise_type": requirement_type.replace("_total", "")}},
                {"$group": {"_id": None, "total": {"$sum": "$value"}}}
            ]
            result = await db.workout_logs.aggregate(pipeline).to_list(1)
            current_value = result[0]["total"] if result else 0
        
        # Update or create user achievement progress
        existing_ua = next((ua for ua in user_achievements if ua["achievement_id"] == achievement_id), None)
        
        if existing_ua:
            # Update progress
            await db.user_achievements.update_one(
                {"_id": existing_ua["_id"]},
                {"$set": {
                    "current_progress": current_value,
                    "completed": current_value >= requirement_value,
                    "unlocked_at": datetime.utcnow() if current_value >= requirement_value else existing_ua.get("unlocked_at")
                }}
            )
        else:
            # Create new user achievement
            user_achievement = {
                "user_id": user_id,
                "achievement_id": achievement_id,
                "current_progress": current_value,
                "completed": current_value >= requirement_value,
                "unlocked_at": datetime.utcnow() if current_value >= requirement_value else None
            }
            await db.user_achievements.insert_one(user_achievement)
        
        # Track newly unlocked achievements
        if current_value >= requirement_value and achievement_id not in completed_achievement_ids:
            newly_unlocked.append(achievement)
    
    return newly_unlocked

async def create_user_settings(user_id: ObjectId):
    """Create default settings for a new user"""
    settings = {
        "user_id": user_id,
        "notification_quest_reminders": True,
        "notification_level_up": True,
        "notification_achievement_unlock": True,
        "privacy_profile_visible": True,
        "privacy_stats_visible": True,
        "app_theme": "dark",
        "app_units": "metric",
        "app_language": "en",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.user_settings.insert_one(settings)

# Achievements Routes
@api_router.get("/achievements", response_model=List[Achievement])
async def get_achievements(current_user = Depends(get_current_user)):
    """Get all available achievements"""
    achievements = await db.achievements.find({}).to_list(1000)
    
    achievement_list = []
    for achievement in achievements:
        achievement_list.append(Achievement(
            id=str(achievement['_id']),
            name=achievement['name'],
            description=achievement['description'],
            category=achievement['category'],
            requirement_type=achievement['requirement_type'],
            requirement_value=achievement['requirement_value'],
            xp_reward=achievement['xp_reward'],
            gold_reward=achievement['gold_reward'],
            icon=achievement['icon'],
            rarity=achievement['rarity'],
            created_at=achievement['created_at']
        ))
    
    return achievement_list

@api_router.get("/achievements/user", response_model=List[UserAchievement])
async def get_user_achievements(current_user = Depends(get_current_user)):
    """Get user's achievement progress"""
    user_achievements = await db.user_achievements.find({
        "user_id": current_user['_id']
    }).to_list(1000)
    
    ua_list = []
    for ua in user_achievements:
        ua_list.append(UserAchievement(
            id=str(ua['_id']),
            user_id=str(ua['user_id']),
            achievement_id=str(ua['achievement_id']),
            unlocked_at=ua.get('unlocked_at'),
            current_progress=ua['current_progress'],
            completed=ua['completed']
        ))
    
    return ua_list

# Settings Routes
@api_router.get("/settings")
async def get_user_settings(current_user = Depends(get_current_user)):
    """Get user settings"""
    settings = await db.user_settings.find_one({"user_id": current_user['_id']})
    
    if not settings:
        # Create default settings if they don't exist
        await create_user_settings(current_user['_id'])
        settings = await db.user_settings.find_one({"user_id": current_user['_id']})
    
    return UserSettings(
        notification_quest_reminders=settings['notification_quest_reminders'],
        notification_level_up=settings['notification_level_up'],
        notification_achievement_unlock=settings['notification_achievement_unlock'],
        privacy_profile_visible=settings['privacy_profile_visible'],
        privacy_stats_visible=settings['privacy_stats_visible'],
        app_theme=settings['app_theme'],
        app_units=settings['app_units'],
        app_language=settings['app_language']
    )

@api_router.put("/settings")
async def update_user_settings(settings_update: SettingsUpdate, current_user = Depends(get_current_user)):
    """Update user settings"""
    update_data = {}
    
    # Only update fields that are provided
    for field, value in settings_update.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.user_settings.update_one(
            {"user_id": current_user['_id']},
            {"$set": update_data},
            upsert=True
        )
    
    return {"message": "Settings updated successfully"}

# Profile Picture Routes  
from fastapi import UploadFile, File
import base64

@api_router.post("/profile-picture/upload")
async def upload_profile_picture(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    """Upload profile picture"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (5MB limit)
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File size too large. Maximum 5MB allowed.")
    
    # Convert to base64 for storage in MongoDB
    file_base64 = base64.b64encode(content).decode('utf-8')
    
    # Update user profile with image data
    await db.users.update_one(
        {"_id": current_user['_id']},
        {"$set": {
            "profile_picture": file_base64,
            "profile_picture_type": file.content_type,
            "profile_picture_updated": datetime.utcnow()
        }}
    )
    
    return {"message": "Profile picture uploaded successfully"}

@api_router.get("/profile-picture")
async def get_profile_picture(current_user = Depends(get_current_user)):
    """Get user's profile picture"""
    user = await db.users.find_one({"_id": current_user['_id']})
    
    if not user.get('profile_picture'):
        raise HTTPException(status_code=404, detail="No profile picture found")
    
    return {
        "profile_picture": user['profile_picture'],
        "content_type": user.get('profile_picture_type', 'image/jpeg'),
        "updated_at": user.get('profile_picture_updated')
    }

@api_router.delete("/profile-picture")
async def delete_profile_picture(current_user = Depends(get_current_user)):
    """Delete user's profile picture"""
    await db.users.update_one(
        {"_id": current_user['_id']},
        {"$unset": {
            "profile_picture": "",
            "profile_picture_type": "",
            "profile_picture_updated": ""
        }}
    )
    
    return {"message": "Profile picture deleted successfully"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Level Up Fitness API is running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_achievements()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()