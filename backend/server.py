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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()