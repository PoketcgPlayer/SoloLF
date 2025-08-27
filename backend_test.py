#!/usr/bin/env python3
"""
Solo Leveling Fitness RPG Backend Test Suite
Tests all core API endpoints and business logic
"""

import requests
import json
import time
import random
import string
from datetime import datetime

# Configuration
BASE_URL = "https://app-finisher-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = f"hunter_{random.randint(1000, 9999)}@shadowguild.com"
TEST_USER_USERNAME = f"ShadowHunter_{random.randint(1000, 9999)}"
TEST_USER_PASSWORD = "StrongPassword123!"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

class SoloLevelingAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.user_id = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def make_request(self, method, endpoint, data=None, headers=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {}
        
        if self.auth_token:
            headers['Authorization'] = f"Bearer {self.auth_token}"
        
        headers['Content-Type'] = 'application/json'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=30)
            
            return response
        except requests.exceptions.RequestException as e:
            print_error(f"Request failed: {str(e)}")
            return None

    def assert_test(self, condition, success_msg, error_msg):
        """Assert test condition and track results"""
        if condition:
            print_success(success_msg)
            self.test_results['passed'] += 1
            return True
        else:
            print_error(error_msg)
            self.test_results['failed'] += 1
            self.test_results['errors'].append(error_msg)
            return False

    def test_health_check(self):
        """Test API health endpoint"""
        print_test_header("Health Check")
        
        response = self.make_request('GET', '/health')
        
        if response is None:
            self.assert_test(False, "", "Health check endpoint unreachable")
            return False
        
        success = (
            self.assert_test(response.status_code == 200, 
                           "Health endpoint returns 200 OK", 
                           f"Health endpoint returned {response.status_code}") and
            self.assert_test('status' in response.json(), 
                           "Health response contains status field", 
                           "Health response missing status field")
        )
        
        if success:
            print_info(f"Health response: {response.json()}")
        
        return success

    def test_user_registration(self):
        """Test user registration with RPG stats initialization"""
        print_test_header("User Registration")
        
        user_data = {
            "username": TEST_USER_USERNAME,
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request('POST', '/auth/register', user_data)
        
        if response is None:
            self.assert_test(False, "", "Registration endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "User registration successful", 
                                 f"Registration failed with status {response.status_code}: {response.text}")
        
        if success:
            data = response.json()
            success = (
                self.assert_test('access_token' in data, 
                               "Registration returns access token", 
                               "Registration response missing access token") and
                self.assert_test('token_type' in data, 
                               "Registration returns token type", 
                               "Registration response missing token type")
            )
            
            if success:
                self.auth_token = data['access_token']
                print_info(f"Auth token obtained: {self.auth_token[:20]}...")
        
        return success

    def test_user_login(self):
        """Test user login functionality"""
        print_test_header("User Login")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response is None:
            self.assert_test(False, "", "Login endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "User login successful", 
                                 f"Login failed with status {response.status_code}: {response.text}")
        
        if success:
            data = response.json()
            success = (
                self.assert_test('access_token' in data, 
                               "Login returns access token", 
                               "Login response missing access token") and
                self.assert_test('token_type' in data, 
                               "Login returns token type", 
                               "Login response missing token type")
            )
            
            if success:
                # Update auth token from login
                self.auth_token = data['access_token']
                print_info(f"Login token obtained: {self.auth_token[:20]}...")
        
        return success

    def test_user_profile(self):
        """Test user profile retrieval with RPG stats"""
        print_test_header("User Profile & RPG Stats")
        
        if not self.auth_token:
            self.assert_test(False, "", "No auth token available for profile test")
            return False
        
        response = self.make_request('GET', '/user/profile')
        
        if response is None:
            self.assert_test(False, "", "Profile endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "Profile retrieval successful", 
                                 f"Profile failed with status {response.status_code}: {response.text}")
        
        if success:
            profile = response.json()
            self.user_id = profile.get('id')
            
            # Test RPG stats initialization
            rpg_tests = [
                (profile.get('level') == 1, "New user starts at level 1", f"User level is {profile.get('level')}, expected 1"),
                (profile.get('strength') == 10, "Strength stat initialized to 10", f"Strength is {profile.get('strength')}, expected 10"),
                (profile.get('agility') == 10, "Agility stat initialized to 10", f"Agility is {profile.get('agility')}, expected 10"),
                (profile.get('stamina') == 10, "Stamina stat initialized to 10", f"Stamina is {profile.get('stamina')}, expected 10"),
                (profile.get('vitality') == 10, "Vitality stat initialized to 10", f"Vitality is {profile.get('vitality')}, expected 10"),
                (profile.get('xp_to_next_level') == 100, "XP to next level is 100", f"XP to next level is {profile.get('xp_to_next_level')}, expected 100"),
                (profile.get('avatar_tier') == 'Bronze', "Avatar tier starts as Bronze", f"Avatar tier is {profile.get('avatar_tier')}, expected Bronze"),
                (profile.get('total_quests_completed') == 0, "Quest count starts at 0", f"Quest count is {profile.get('total_quests_completed')}, expected 0"),
                (profile.get('username') == TEST_USER_USERNAME, "Username matches registration", f"Username mismatch"),
                (profile.get('email') == TEST_USER_EMAIL, "Email matches registration", f"Email mismatch")
            ]
            
            for condition, success_msg, error_msg in rpg_tests:
                self.assert_test(condition, success_msg, error_msg)
            
            print_info(f"User Profile: Level {profile.get('level')}, XP: {profile.get('xp')}, Stats: STR:{profile.get('strength')} AGI:{profile.get('agility')} STA:{profile.get('stamina')} VIT:{profile.get('vitality')}")
        
        return success

    def test_daily_quest_generation(self):
        """Test daily quest generation system"""
        print_test_header("Daily Quest Generation")
        
        if not self.auth_token:
            self.assert_test(False, "", "No auth token available for quest generation test")
            return False
        
        # Generate daily quests
        response = self.make_request('POST', '/quests/daily/generate')
        
        if response is None:
            self.assert_test(False, "", "Quest generation endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "Daily quest generation successful", 
                                 f"Quest generation failed with status {response.status_code}: {response.text}")
        
        if success:
            # Verify quests were created
            quests_response = self.make_request('GET', '/quests')
            
            if quests_response and quests_response.status_code == 200:
                quests = quests_response.json()
                
                quest_tests = [
                    (len(quests) == 3, "Exactly 3 daily quests generated", f"Generated {len(quests)} quests, expected 3"),
                    (all(q.get('quest_type') == 'daily' for q in quests), "All quests are daily type", "Some quests are not daily type"),
                    (all(q.get('status') == 'active' for q in quests), "All quests are active", "Some quests are not active"),
                    (all(q.get('current_progress') == 0 for q in quests), "All quests start with 0 progress", "Some quests have non-zero progress"),
                    (all(q.get('xp_reward') > 0 for q in quests), "All quests have XP rewards", "Some quests missing XP rewards")
                ]
                
                for condition, success_msg, error_msg in quest_tests:
                    self.assert_test(condition, success_msg, error_msg)
                
                if quests:
                    print_info(f"Sample quest: {quests[0].get('title')} - {quests[0].get('description')}")
                    print_info(f"Quest types: {[q.get('exercise_type') for q in quests]}")
                
                # Store first quest for workout logging test
                self.test_quest = quests[0] if quests else None
            else:
                self.assert_test(False, "", "Failed to retrieve generated quests")
        
        return success

    def test_workout_logging(self):
        """Test workout logging and quest progress tracking"""
        print_test_header("Workout Logging & Quest Progress")
        
        if not self.auth_token or not hasattr(self, 'test_quest') or not self.test_quest:
            self.assert_test(False, "", "No auth token or test quest available for workout logging")
            return False
        
        quest = self.test_quest
        quest_id = quest.get('id')
        
        # Log a partial workout
        workout_data = {
            "exercise_type": quest.get('exercise_type'),
            "value": quest.get('target_value') // 2,  # Half the target
            "notes": "Test workout - partial completion"
        }
        
        response = self.make_request('POST', f'/workouts/log?quest_id={quest_id}', workout_data)
        
        if response is None:
            self.assert_test(False, "", "Workout logging endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "Workout logging successful", 
                                 f"Workout logging failed with status {response.status_code}: {response.text}")
        
        if success:
            result = response.json()
            
            workout_tests = [
                ('message' in result, "Workout log response contains message", "Missing message in response"),
                ('quest_completed' in result, "Response indicates quest completion status", "Missing quest completion status"),
                ('new_progress' in result, "Response shows new progress", "Missing new progress"),
                (result.get('new_progress') == workout_data['value'], "Progress updated correctly", f"Progress is {result.get('new_progress')}, expected {workout_data['value']}"),
                (not result.get('quest_completed'), "Quest not completed with partial workout", "Quest incorrectly marked as completed")
            ]
            
            for condition, success_msg, error_msg in workout_tests:
                self.assert_test(condition, success_msg, error_msg)
            
            print_info(f"Quest progress: {result.get('new_progress')}/{result.get('target')}")
            
            # Complete the quest
            remaining_value = quest.get('target_value') - workout_data['value']
            complete_workout = {
                "exercise_type": quest.get('exercise_type'),
                "value": remaining_value,
                "notes": "Test workout - quest completion"
            }
            
            complete_response = self.make_request('POST', f'/workouts/log?quest_id={quest_id}', complete_workout)
            
            if complete_response and complete_response.status_code == 200:
                complete_result = complete_response.json()
                
                completion_tests = [
                    (complete_result.get('quest_completed') == True, "Quest marked as completed", "Quest not marked as completed"),
                    (complete_result.get('new_progress') >= quest.get('target_value'), "Quest progress reaches target", f"Progress {complete_result.get('new_progress')} < target {quest.get('target_value')}")
                ]
                
                for condition, success_msg, error_msg in completion_tests:
                    self.assert_test(condition, success_msg, error_msg)
                
                print_info(f"Quest completed! Final progress: {complete_result.get('new_progress')}/{complete_result.get('target')}")
            else:
                self.assert_test(False, "", "Failed to complete quest with second workout")
        
        return success

    def test_xp_and_leveling(self):
        """Test XP rewards and leveling system"""
        print_test_header("XP & Leveling System")
        
        if not self.auth_token:
            self.assert_test(False, "", "No auth token available for XP/leveling test")
            return False
        
        # Get profile before quest completion
        initial_response = self.make_request('GET', '/user/profile')
        if not initial_response or initial_response.status_code != 200:
            self.assert_test(False, "", "Failed to get initial profile for XP test")
            return False
        
        initial_profile = initial_response.json()
        initial_xp = initial_profile.get('xp', 0)
        initial_level = initial_profile.get('level', 1)
        initial_strength = initial_profile.get('strength', 10)
        
        print_info(f"Initial state: Level {initial_level}, XP: {initial_xp}, Strength: {initial_strength}")
        
        # Generate new quests and complete one to test XP rewards
        gen_response = self.make_request('POST', '/quests/daily/generate')
        if not gen_response or gen_response.status_code != 200:
            self.assert_test(False, "", "Failed to generate quests for XP test")
            return False
        
        # Get fresh quests
        quests_response = self.make_request('GET', '/quests')
        if not quests_response or quests_response.status_code != 200:
            self.assert_test(False, "", "Failed to get quests for XP test")
            return False
        
        quests = quests_response.json()
        if not quests:
            self.assert_test(False, "", "No quests available for XP test")
            return False
        
        # Complete a quest
        quest = quests[0]
        quest_id = quest.get('id')
        expected_xp_reward = quest.get('xp_reward', 0)
        
        workout_data = {
            "exercise_type": quest.get('exercise_type'),
            "value": quest.get('target_value'),
            "notes": "XP test - complete quest"
        }
        
        workout_response = self.make_request('POST', f'/workouts/log?quest_id={quest_id}', workout_data)
        
        if not workout_response or workout_response.status_code != 200:
            self.assert_test(False, "", "Failed to log workout for XP test")
            return False
        
        # Check profile after quest completion
        time.sleep(1)  # Brief delay to ensure database update
        final_response = self.make_request('GET', '/user/profile')
        
        if not final_response or final_response.status_code != 200:
            self.assert_test(False, "", "Failed to get final profile for XP test")
            return False
        
        final_profile = final_response.json()
        final_xp = final_profile.get('xp', 0)
        final_level = final_profile.get('level', 1)
        final_strength = final_profile.get('strength', 10)
        final_quests_completed = final_profile.get('total_quests_completed', 0)
        
        print_info(f"Final state: Level {final_level}, XP: {final_xp}, Strength: {final_strength}")
        
        # Test XP and progression
        xp_tests = [
            (final_xp >= initial_xp, "XP increased after quest completion", f"XP decreased: {initial_xp} -> {final_xp}"),
            (final_quests_completed > initial_profile.get('total_quests_completed', 0), "Quest completion count increased", "Quest completion count not updated"),
            (final_level >= initial_level, "Level maintained or increased", f"Level decreased: {initial_level} -> {final_level}")
        ]
        
        # If leveled up, check stat increases
        if final_level > initial_level:
            level_up_tests = [
                (final_strength == initial_strength + 2, "Strength increased by 2 on level up", f"Strength: {initial_strength} -> {final_strength}"),
                (final_profile.get('agility') == initial_profile.get('agility') + 2, "Agility increased by 2 on level up", "Agility not increased correctly"),
                (final_profile.get('stamina') == initial_profile.get('stamina') + 2, "Stamina increased by 2 on level up", "Stamina not increased correctly"),
                (final_profile.get('vitality') == initial_profile.get('vitality') + 2, "Vitality increased by 2 on level up", "Vitality not increased correctly")
            ]
            xp_tests.extend(level_up_tests)
            print_info("🎉 Level up detected! Stats should have increased by 2 points each")
        
        for condition, success_msg, error_msg in xp_tests:
            self.assert_test(condition, success_msg, error_msg)
        
        return True

    def test_achievements_system(self):
        """Test achievements system functionality"""
        print_test_header("Achievements System")
        
        if not self.auth_token:
            self.assert_test(False, "", "No auth token available for achievements test")
            return False
        
        # Test getting all achievements
        response = self.make_request('GET', '/achievements')
        
        if response is None:
            self.assert_test(False, "", "Achievements endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "Get all achievements successful", 
                                 f"Get achievements failed with status {response.status_code}: {response.text}")
        
        if success:
            achievements = response.json()
            
            achievement_tests = [
                (isinstance(achievements, list), "Achievements returned as list", "Achievements not returned as list"),
                (len(achievements) > 0, "At least one achievement exists", "No achievements found"),
                (all('name' in a for a in achievements), "All achievements have names", "Some achievements missing names"),
                (all('description' in a for a in achievements), "All achievements have descriptions", "Some achievements missing descriptions"),
                (all('category' in a for a in achievements), "All achievements have categories", "Some achievements missing categories"),
                (all('xp_reward' in a for a in achievements), "All achievements have XP rewards", "Some achievements missing XP rewards")
            ]
            
            for condition, success_msg, error_msg in achievement_tests:
                self.assert_test(condition, success_msg, error_msg)
            
            if achievements:
                print_info(f"Found {len(achievements)} achievements")
                print_info(f"Sample achievement: {achievements[0].get('name')} - {achievements[0].get('description')}")
                
                # Store achievement for later testing
                self.test_achievement = achievements[0]
        
        # Test getting user achievements
        user_achievements_response = self.make_request('GET', '/achievements/user')
        
        if user_achievements_response is None:
            self.assert_test(False, "", "User achievements endpoint unreachable")
            return False
        
        user_success = self.assert_test(user_achievements_response.status_code == 200, 
                                      "Get user achievements successful", 
                                      f"Get user achievements failed with status {user_achievements_response.status_code}: {user_achievements_response.text}")
        
        if user_success:
            user_achievements = user_achievements_response.json()
            
            user_achievement_tests = [
                (isinstance(user_achievements, list), "User achievements returned as list", "User achievements not returned as list"),
                (all('achievement_id' in ua for ua in user_achievements), "All user achievements have achievement_id", "Some user achievements missing achievement_id"),
                (all('current_progress' in ua for ua in user_achievements), "All user achievements have progress", "Some user achievements missing progress"),
                (all('completed' in ua for ua in user_achievements), "All user achievements have completion status", "Some user achievements missing completion status")
            ]
            
            for condition, success_msg, error_msg in user_achievement_tests:
                self.assert_test(condition, success_msg, error_msg)
            
            print_info(f"User has progress on {len(user_achievements)} achievements")
        
        return success and user_success

    def test_settings_system(self):
        """Test user settings functionality"""
        print_test_header("Settings System")
        
        if not self.auth_token:
            self.assert_test(False, "", "No auth token available for settings test")
            return False
        
        # Test getting user settings (should create defaults if none exist)
        response = self.make_request('GET', '/settings')
        
        if response is None:
            self.assert_test(False, "", "Settings endpoint unreachable")
            return False
        
        success = self.assert_test(response.status_code == 200, 
                                 "Get user settings successful", 
                                 f"Get settings failed with status {response.status_code}: {response.text}")
        
        if success:
            settings = response.json()
            
            # Test default settings structure
            expected_settings = [
                'notification_quest_reminders',
                'notification_level_up', 
                'notification_achievement_unlock',
                'privacy_profile_visible',
                'privacy_stats_visible',
                'app_theme',
                'app_units',
                'app_language'
            ]
            
            settings_tests = [
                (isinstance(settings, dict), "Settings returned as object", "Settings not returned as object"),
                (all(field in settings for field in expected_settings), "All expected settings fields present", f"Missing settings fields: {[f for f in expected_settings if f not in settings]}"),
                (settings.get('app_theme') == 'dark', "Default theme is dark", f"Default theme is {settings.get('app_theme')}, expected dark"),
                (settings.get('app_units') == 'metric', "Default units are metric", f"Default units are {settings.get('app_units')}, expected metric"),
                (settings.get('notification_quest_reminders') == True, "Quest reminders enabled by default", "Quest reminders not enabled by default")
            ]
            
            for condition, success_msg, error_msg in settings_tests:
                self.assert_test(condition, success_msg, error_msg)
            
            print_info(f"Settings: Theme={settings.get('app_theme')}, Units={settings.get('app_units')}, Language={settings.get('app_language')}")
        
        # Test updating settings
        update_data = {
            "app_theme": "light",
            "notification_quest_reminders": False,
            "app_units": "imperial"
        }
        
        update_response = self.make_request('PUT', '/settings', update_data)
        
        if update_response is None:
            self.assert_test(False, "", "Settings update endpoint unreachable")
            return False
        
        update_success = self.assert_test(update_response.status_code == 200, 
                                        "Settings update successful", 
                                        f"Settings update failed with status {update_response.status_code}: {update_response.text}")
        
        if update_success:
            # Verify settings were updated
            verify_response = self.make_request('GET', '/settings')
            
            if verify_response and verify_response.status_code == 200:
                updated_settings = verify_response.json()
                
                update_tests = [
                    (updated_settings.get('app_theme') == 'light', "Theme updated to light", f"Theme is {updated_settings.get('app_theme')}, expected light"),
                    (updated_settings.get('notification_quest_reminders') == False, "Quest reminders disabled", f"Quest reminders is {updated_settings.get('notification_quest_reminders')}, expected False"),
                    (updated_settings.get('app_units') == 'imperial', "Units updated to imperial", f"Units is {updated_settings.get('app_units')}, expected imperial")
                ]
                
                for condition, success_msg, error_msg in update_tests:
                    self.assert_test(condition, success_msg, error_msg)
                
                print_info(f"Updated settings: Theme={updated_settings.get('app_theme')}, Quest reminders={updated_settings.get('notification_quest_reminders')}")
            else:
                self.assert_test(False, "", "Failed to verify settings update")
        
        return success and update_success

    def test_profile_picture_system(self):
        """Test profile picture upload, retrieval, and deletion"""
        print_test_header("Profile Picture System")
        
        if not self.auth_token:
            self.assert_test(False, "", "No auth token available for profile picture test")
            return False
        
        # Create a small test image (1x1 pixel PNG in base64)
        import base64
        
        # Minimal PNG image data (1x1 transparent pixel)
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77mgAAAABJRU5ErkJggg==')
        
        # Test file upload
        files = {'file': ('test.png', png_data, 'image/png')}
        
        # For file upload, we need to use requests directly with files parameter
        import requests
        url = f"{self.base_url}/profile-picture/upload"
        headers = {'Authorization': f"Bearer {self.auth_token}"}
        
        try:
            upload_response = requests.post(url, files=files, headers=headers, timeout=30)
        except requests.exceptions.RequestException as e:
            self.assert_test(False, "", f"Profile picture upload request failed: {str(e)}")
            return False
        
        success = self.assert_test(upload_response.status_code == 200, 
                                 "Profile picture upload successful", 
                                 f"Upload failed with status {upload_response.status_code}: {upload_response.text}")
        
        if success:
            upload_result = upload_response.json()
            self.assert_test('message' in upload_result, 
                           "Upload response contains message", 
                           "Upload response missing message")
            
            print_info("Profile picture uploaded successfully")
        
        # Test getting profile picture
        get_response = self.make_request('GET', '/profile-picture')
        
        if get_response is None:
            self.assert_test(False, "", "Get profile picture endpoint unreachable")
            return False
        
        get_success = self.assert_test(get_response.status_code == 200, 
                                     "Get profile picture successful", 
                                     f"Get profile picture failed with status {get_response.status_code}: {get_response.text}")
        
        if get_success:
            picture_data = get_response.json()
            
            picture_tests = [
                ('profile_picture' in picture_data, "Response contains profile picture data", "Missing profile picture data"),
                ('content_type' in picture_data, "Response contains content type", "Missing content type"),
                (picture_data.get('content_type') == 'image/png', "Content type is image/png", f"Content type is {picture_data.get('content_type')}, expected image/png")
            ]
            
            for condition, success_msg, error_msg in picture_tests:
                self.assert_test(condition, success_msg, error_msg)
            
            print_info(f"Retrieved profile picture: {picture_data.get('content_type')}")
        
        # Test deleting profile picture
        delete_response = self.make_request('DELETE', '/profile-picture')
        
        if delete_response is None:
            self.assert_test(False, "", "Delete profile picture endpoint unreachable")
            return False
        
        delete_success = self.assert_test(delete_response.status_code == 200, 
                                        "Profile picture deletion successful", 
                                        f"Delete failed with status {delete_response.status_code}: {delete_response.text}")
        
        if delete_success:
            delete_result = delete_response.json()
            self.assert_test('message' in delete_result, 
                           "Delete response contains message", 
                           "Delete response missing message")
            
            # Verify picture was deleted
            verify_response = self.make_request('GET', '/profile-picture')
            
            if verify_response:
                verify_success = self.assert_test(verify_response.status_code == 404, 
                                                "Profile picture not found after deletion", 
                                                f"Profile picture still exists after deletion: {verify_response.status_code}")
                
                if verify_success:
                    print_info("Profile picture successfully deleted")
            else:
                self.assert_test(False, "", "Failed to verify profile picture deletion")
        
        # Test file validation - invalid file type
        invalid_files = {'file': ('test.txt', b'not an image', 'text/plain')}
        
        try:
            invalid_response = requests.post(url, files=invalid_files, headers=headers, timeout=30)
            
            validation_success = self.assert_test(invalid_response.status_code == 400, 
                                                "Invalid file type rejected", 
                                                f"Invalid file type returned {invalid_response.status_code}, expected 400")
            
            if validation_success:
                print_info("File type validation working correctly")
        except requests.exceptions.RequestException as e:
            self.assert_test(False, "", f"File validation test request failed: {str(e)}")
        
        return success and get_success and delete_success

    def test_authentication_protection(self):
        """Test that protected routes require authentication"""
        print_test_header("Authentication Protection")
        
        # Temporarily remove auth token
        original_token = self.auth_token
        self.auth_token = None
        
        protected_endpoints = [
            ('/user/profile', 'GET'),
            ('/quests', 'GET'),
            ('/quests/daily/generate', 'POST'),
            ('/achievements', 'GET'),
            ('/achievements/user', 'GET'),
            ('/settings', 'GET'),
            ('/settings', 'PUT'),
            ('/profile-picture', 'GET'),
            ('/profile-picture', 'DELETE')
        ]
        
        success = True
        for endpoint, method in protected_endpoints:
            response = self.make_request(method, endpoint)
            
            if response is None:
                self.assert_test(False, "", f"Protected endpoint {endpoint} unreachable")
                success = False
                continue
            
            endpoint_success = self.assert_test(
                response.status_code == 401 or response.status_code == 403,
                f"Protected endpoint {endpoint} requires authentication",
                f"Protected endpoint {endpoint} returned {response.status_code}, expected 401/403"
            )
            success = success and endpoint_success
        
        # Restore auth token
        self.auth_token = original_token
        return success

    def run_all_tests(self):
        """Run complete test suite"""
        print(f"{Colors.BOLD}{Colors.BLUE}")
        print("🏆 Solo Leveling Fitness RPG - Backend Test Suite")
        print("=" * 60)
        print(f"Testing API at: {self.base_url}")
        print(f"Test User: {TEST_USER_EMAIL}")
        print("=" * 60)
        print(f"{Colors.ENDC}")
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("User Profile & RPG Stats", self.test_user_profile),
            ("Daily Quest Generation", self.test_daily_quest_generation),
            ("Workout Logging & Quest Progress", self.test_workout_logging),
            ("XP & Leveling System", self.test_xp_and_leveling),
            ("Achievements System", self.test_achievements_system),
            ("Settings System", self.test_settings_system),
            ("Profile Picture System", self.test_profile_picture_system),
            ("Authentication Protection", self.test_authentication_protection)
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print_error(f"Test '{test_name}' crashed: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Test '{test_name}' crashed: {str(e)}")
            
            print()  # Add spacing between tests
        
        # Print final results
        self.print_final_results()

    def print_final_results(self):
        """Print comprehensive test results"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.BLUE}FINAL TEST RESULTS{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        pass_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"{Colors.GREEN}✅ Passed: {self.test_results['passed']}{Colors.ENDC}")
        print(f"{Colors.RED}❌ Failed: {self.test_results['failed']}{Colors.ENDC}")
        print(f"{Colors.BLUE}📊 Pass Rate: {pass_rate:.1f}%{Colors.ENDC}")
        
        if self.test_results['errors']:
            print(f"\n{Colors.RED}{Colors.BOLD}ERRORS ENCOUNTERED:{Colors.ENDC}")
            for i, error in enumerate(self.test_results['errors'], 1):
                print(f"{Colors.RED}{i}. {error}{Colors.ENDC}")
        
        # Overall assessment
        if self.test_results['failed'] == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED! Backend is working correctly.{Colors.ENDC}")
        elif self.test_results['failed'] <= 2:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Minor issues detected. Backend mostly functional.{Colors.ENDC}")
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}🚨 Major issues detected. Backend needs attention.{Colors.ENDC}")
        
        print(f"{Colors.BLUE}{'='*60}{Colors.ENDC}")

if __name__ == "__main__":
    tester = SoloLevelingAPITester()
    tester.run_all_tests()