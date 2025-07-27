# Redis & Caching Strategies ⚡

Master Redis data structures, advanced caching patterns, and high-performance strategies for building scalable, lightning-fast applications.

## Table of Contents

- [Redis Data Structures Deep Dive](#redis-data-structures-deep-dive)
- [Advanced Caching Patterns](#advanced-caching-patterns)
- [Performance Optimization](#performance-optimization)
- [Redis Clustering & High Availability](#redis-clustering--high-availability)
- [Production Deployment & Monitoring](#production-deployment--monitoring)
- [Integration Patterns](#integration-patterns)

---

## Redis Data Structures Deep Dive

### Strings and Advanced Operations

```python
import redis
import json
import time
from datetime import datetime, timedelta

# Advanced Redis client configuration
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True,
    retry_on_timeout=True,
    retry_on_error=[redis.ConnectionError, redis.TimeoutError],
    socket_connect_timeout=5,
    socket_timeout=5,
    health_check_interval=30
)

class RedisStringOperations:
    def __init__(self, redis_client):
        self.redis = redis_client

    # Pattern 1: Atomic Counters and Metrics
    def implement_counters(self):
        """Advanced counter operations for analytics"""

        # Daily page views with automatic reset
        today = datetime.now().strftime('%Y-%m-%d')
        page_view_key = f"pageviews:{today}"

        # Increment page views
        current_views = self.redis.incr(page_view_key)

        # Set expiration for automatic cleanup (36 hours for overlap)
        self.redis.expire(page_view_key, 36 * 3600)

        # Rate limiting with sliding window
        user_id = "user123"
        rate_limit_key = f"rate_limit:{user_id}"
        current_time = time.time()

        # Remove old entries (older than 1 hour)
        self.redis.zremrangebyscore(rate_limit_key, 0, current_time - 3600)

        # Count current requests
        current_requests = self.redis.zcard(rate_limit_key)

        if current_requests < 100:  # Rate limit: 100 requests per hour
            # Add current request
            self.redis.zadd(rate_limit_key, {str(current_time): current_time})
            self.redis.expire(rate_limit_key, 3600)
            return True, current_requests + 1
        else:
            return False, current_requests

    # Pattern 2: Bitwise Operations for Analytics
    def implement_bitmap_analytics(self):
        """Use bitmaps for efficient user activity tracking"""

        # Track daily active users
        today = datetime.now().strftime('%Y-%m-%d')
        dau_key = f"dau:{today}"

        # Set bit for user activity (user_id as offset)
        user_id = 12345
        self.redis.setbit(dau_key, user_id, 1)

        # Count daily active users
        daily_active_users = self.redis.bitcount(dau_key)

        # Track weekly active users using BITOP
        week_start = datetime.now().strftime('%Y-W%U')
        wau_key = f"wau:{week_start}"

        # Union of last 7 days
        daily_keys = []
        for i in range(7):
            day = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            daily_keys.append(f"dau:{day}")

        if daily_keys:
            self.redis.bitop('OR', wau_key, *daily_keys)
            weekly_active_users = self.redis.bitcount(wau_key)
            self.redis.expire(wau_key, 7 * 24 * 3600)  # 7 days

        return {
            'daily_active_users': daily_active_users,
            'weekly_active_users': weekly_active_users
        }

    # Pattern 3: HyperLogLog for Unique Counts
    def implement_hyperloglog_uniques(self):
        """Use HyperLogLog for memory-efficient unique counting"""

        # Track unique visitors
        visitors_key = "unique_visitors:2024-01"

        # Add visitors (can handle millions with ~12KB memory)
        visitor_ips = ["192.168.1.1", "10.0.0.1", "172.16.0.1"]
        for ip in visitor_ips:
            self.redis.pfadd(visitors_key, ip)

        # Get unique visitor count (approximate)
        unique_visitors = self.redis.pfcount(visitors_key)

        # Merge multiple HyperLogLogs
        monthly_key = "unique_visitors:2024-01"
        weekly_keys = [f"unique_visitors:2024-W{i}" for i in range(1, 5)]

        # Merge weekly data into monthly
        if weekly_keys:
            self.redis.pfmerge(monthly_key, *weekly_keys)
            monthly_uniques = self.redis.pfcount(monthly_key)

        return {
            'current_uniques': unique_visitors,
            'monthly_uniques': monthly_uniques
        }

# Advanced Hash Operations
class RedisHashOperations:
    def __init__(self, redis_client):
        self.redis = redis_client

    # Pattern 1: User Session Management
    def session_management(self):
        """Complete session management with hashes"""

        session_id = "sess_abc123"
        session_key = f"session:{session_id}"

        # Create session with multiple fields
        session_data = {
            'user_id': '12345',
            'email': 'user@example.com',
            'login_time': datetime.now().isoformat(),
            'ip_address': '192.168.1.100',
            'user_agent': 'Mozilla/5.0...',
            'permissions': json.dumps(['read', 'write', 'admin']),
            'preferences': json.dumps({
                'theme': 'dark',
                'language': 'en',
                'notifications': True
            })
        }

        # Set multiple fields atomically
        self.redis.hset(session_key, mapping=session_data)

        # Set session expiration (24 hours)
        self.redis.expire(session_key, 24 * 3600)

        # Update specific fields
        self.redis.hset(session_key, 'last_activity', datetime.now().isoformat())

        # Increment activity counter
        self.redis.hincrby(session_key, 'page_views', 1)

        # Get session data
        session = self.redis.hgetall(session_key)

        # Check if session exists and is valid
        if session:
            session['permissions'] = json.loads(session.get('permissions', '[]'))
            session['preferences'] = json.loads(session.get('preferences', '{}'))

        return session

    # Pattern 2: Real-time Shopping Cart
    def shopping_cart(self, user_id):
        """Redis hash-based shopping cart"""

        cart_key = f"cart:{user_id}"

        def add_item(product_id, quantity, price):
            # Store item data as JSON in hash field
            item_data = {
                'quantity': quantity,
                'price': float(price),
                'added_at': datetime.now().isoformat(),
                'product_id': product_id
            }

            self.redis.hset(cart_key, product_id, json.dumps(item_data))

            # Set cart expiration (30 days)
            self.redis.expire(cart_key, 30 * 24 * 3600)

            return self.get_cart_summary()

        def update_quantity(product_id, new_quantity):
            item_json = self.redis.hget(cart_key, product_id)
            if item_json:
                item_data = json.loads(item_json)
                item_data['quantity'] = new_quantity
                item_data['updated_at'] = datetime.now().isoformat()

                if new_quantity <= 0:
                    self.redis.hdel(cart_key, product_id)
                else:
                    self.redis.hset(cart_key, product_id, json.dumps(item_data))

            return self.get_cart_summary()

        def get_cart_summary():
            cart_items = self.redis.hgetall(cart_key)

            total_items = 0
            total_amount = 0.0
            items = []

            for product_id, item_json in cart_items.items():
                item_data = json.loads(item_json)
                quantity = item_data['quantity']
                price = item_data['price']

                total_items += quantity
                total_amount += quantity * price

                items.append({
                    'product_id': product_id,
                    'quantity': quantity,
                    'price': price,
                    'subtotal': quantity * price,
                    'added_at': item_data['added_at']
                })

            return {
                'items': items,
                'total_items': total_items,
                'total_amount': round(total_amount, 2),
                'cart_age': self.redis.ttl(cart_key)
            }

        return {
            'add_item': add_item,
            'update_quantity': update_quantity,
            'get_summary': get_cart_summary,
            'clear_cart': lambda: self.redis.delete(cart_key)
        }

# Advanced List Operations
class RedisListOperations:
    def __init__(self, redis_client):
        self.redis = redis_client

    # Pattern 1: Task Queue with Priority
    def priority_task_queue(self):
        """Multi-priority task queue implementation"""

        # Different priority queues
        HIGH_PRIORITY = "tasks:high"
        MEDIUM_PRIORITY = "tasks:medium"
        LOW_PRIORITY = "tasks:low"
        PROCESSING = "tasks:processing"

        def enqueue_task(task_data, priority='medium'):
            task_json = json.dumps({
                'id': task_data.get('id'),
                'type': task_data.get('type'),
                'payload': task_data.get('payload'),
                'created_at': datetime.now().isoformat(),
                'priority': priority
            })

            queue_key = {
                'high': HIGH_PRIORITY,
                'medium': MEDIUM_PRIORITY,
                'low': LOW_PRIORITY
            }.get(priority, MEDIUM_PRIORITY)

            self.redis.lpush(queue_key, task_json)

            # Notify workers about new task
            self.redis.publish('task_notification', json.dumps({
                'event': 'new_task',
                'priority': priority,
                'queue_length': self.redis.llen(queue_key)
            }))

        def dequeue_task(timeout=10):
            """Dequeue task with priority order and blocking"""

            # Try high priority first, then medium, then low
            queues = [HIGH_PRIORITY, MEDIUM_PRIORITY, LOW_PRIORITY]

            # Use BRPOPLPUSH for reliable processing
            result = self.redis.brpoplpush(
                queues[0], PROCESSING, timeout=timeout
            )

            if not result:
                # Try other priorities
                for queue in queues[1:]:
                    result = self.redis.brpoplpush(
                        queue, PROCESSING, timeout=1
                    )
                    if result:
                        break

            if result:
                task = json.loads(result)
                task['processing_started'] = datetime.now().isoformat()
                return task

            return None

        def complete_task(task_id):
            """Mark task as completed and remove from processing"""

            # Find and remove task from processing queue
            processing_tasks = self.redis.lrange(PROCESSING, 0, -1)

            for i, task_json in enumerate(processing_tasks):
                task = json.loads(task_json)
                if task.get('id') == task_id:
                    # Remove from processing queue
                    self.redis.lrem(PROCESSING, 1, task_json)

                    # Log completion
                    completion_log = {
                        'task_id': task_id,
                        'completed_at': datetime.now().isoformat(),
                        'processing_time': None
                    }

                    if 'processing_started' in task:
                        start_time = datetime.fromisoformat(task['processing_started'])
                        completion_log['processing_time'] = (
                            datetime.now() - start_time
                        ).total_seconds()

                    # Store in completed log (with TTL)
                    self.redis.setex(
                        f"task_completed:{task_id}",
                        3600,  # 1 hour TTL
                        json.dumps(completion_log)
                    )

                    return True

            return False

        def get_queue_stats():
            """Get queue statistics"""
            return {
                'high_priority': self.redis.llen(HIGH_PRIORITY),
                'medium_priority': self.redis.llen(MEDIUM_PRIORITY),
                'low_priority': self.redis.llen(LOW_PRIORITY),
                'processing': self.redis.llen(PROCESSING)
            }

        return {
            'enqueue': enqueue_task,
            'dequeue': dequeue_task,
            'complete': complete_task,
            'stats': get_queue_stats
        }

    # Pattern 2: Activity Feed
    def activity_feed(self, user_id):
        """User activity feed with Redis lists"""

        feed_key = f"feed:{user_id}"
        MAX_FEED_SIZE = 1000

        def add_activity(activity_type, data):
            activity = {
                'id': f"{activity_type}_{int(time.time() * 1000)}",
                'type': activity_type,
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'user_id': user_id
            }

            # Add to beginning of list
            self.redis.lpush(feed_key, json.dumps(activity))

            # Trim to maximum size
            self.redis.ltrim(feed_key, 0, MAX_FEED_SIZE - 1)

            # Set expiration (30 days)
            self.redis.expire(feed_key, 30 * 24 * 3600)

        def get_feed(page=0, page_size=20):
            start = page * page_size
            end = start + page_size - 1

            activities = self.redis.lrange(feed_key, start, end)
            return [json.loads(activity) for activity in activities]

        return {
            'add_activity': add_activity,
            'get_feed': get_feed
        }

# Advanced Set Operations
class RedisSetOperations:
    def __init__(self, redis_client):
        self.redis = redis_client

    # Pattern 1: Tag-based Filtering
    def tag_filtering_system(self):
        """Advanced tag-based content filtering"""

        def tag_content(content_id, tags):
            """Tag content with multiple tags"""
            for tag in tags:
                tag_key = f"tag:{tag}"
                self.redis.sadd(tag_key, content_id)
                # Set expiration for tag cleanup
                self.redis.expire(tag_key, 7 * 24 * 3600)  # 7 days

        def find_content_by_tags(required_tags=None, any_tags=None, excluded_tags=None):
            """Find content matching tag criteria"""
            temp_key = f"temp:search:{int(time.time() * 1000)}"

            try:
                if required_tags:
                    # Intersection of required tags
                    tag_keys = [f"tag:{tag}" for tag in required_tags]
                    if len(tag_keys) == 1:
                        self.redis.sunionstore(temp_key, tag_keys[0])
                    else:
                        self.redis.sinterstore(temp_key, *tag_keys)

                if any_tags:
                    # Union with any_tags
                    any_tag_keys = [f"tag:{tag}" for tag in any_tags]
                    if self.redis.exists(temp_key):
                        # Union with existing results
                        union_temp = f"temp:union:{int(time.time() * 1000)}"
                        self.redis.sunionstore(union_temp, *any_tag_keys)
                        self.redis.sinterstore(temp_key, temp_key, union_temp)
                        self.redis.delete(union_temp)
                    else:
                        self.redis.sunionstore(temp_key, *any_tag_keys)

                if excluded_tags:
                    # Remove excluded tags
                    for tag in excluded_tags:
                        excluded_key = f"tag:{tag}"
                        if self.redis.exists(excluded_key):
                            self.redis.sdiffstore(temp_key, temp_key, excluded_key)

                # Get results
                results = list(self.redis.smembers(temp_key))

                return results

            finally:
                # Cleanup temporary key
                self.redis.delete(temp_key)

        def get_tag_stats():
            """Get tag usage statistics"""
            pattern = "tag:*"
            tag_keys = self.redis.keys(pattern)

            stats = {}
            for key in tag_keys:
                tag_name = key.replace("tag:", "")
                count = self.redis.scard(key)
                stats[tag_name] = count

            return dict(sorted(stats.items(), key=lambda x: x[1], reverse=True))

        return {
            'tag_content': tag_content,
            'find_content': find_content_by_tags,
            'get_stats': get_tag_stats
        }

    # Pattern 2: Social Features (Followers/Following)
    def social_graph(self):
        """Social graph implementation with sets"""

        def follow_user(follower_id, following_id):
            """User follows another user"""
            followers_key = f"followers:{following_id}"
            following_key = f"following:{follower_id}"

            # Add to both sets atomically
            pipe = self.redis.pipeline()
            pipe.sadd(followers_key, follower_id)
            pipe.sadd(following_key, following_id)
            pipe.execute()

        def unfollow_user(follower_id, following_id):
            """User unfollows another user"""
            followers_key = f"followers:{following_id}"
            following_key = f"following:{follower_id}"

            pipe = self.redis.pipeline()
            pipe.srem(followers_key, follower_id)
            pipe.srem(following_key, following_id)
            pipe.execute()

        def get_mutual_followers(user1_id, user2_id):
            """Find mutual followers between two users"""
            followers1_key = f"followers:{user1_id}"
            followers2_key = f"followers:{user2_id}"

            return list(self.redis.sinter(followers1_key, followers2_key))

        def get_suggested_follows(user_id, limit=10):
            """Suggest users to follow based on mutual connections"""
            following_key = f"following:{user_id}"
            following_list = self.redis.smembers(following_key)

            suggestions = {}

            for followed_user in following_list:
                # Get who this followed user follows
                their_following_key = f"following:{followed_user}"
                their_following = self.redis.smembers(their_following_key)

                for suggestion in their_following:
                    if (suggestion != user_id and
                        not self.redis.sismember(following_key, suggestion)):
                        suggestions[suggestion] = suggestions.get(suggestion, 0) + 1

            # Sort by mutual connection count
            sorted_suggestions = sorted(
                suggestions.items(),
                key=lambda x: x[1],
                reverse=True
            )

            return [user for user, count in sorted_suggestions[:limit]]

        def get_user_stats(user_id):
            """Get user's social stats"""
            return {
                'followers_count': self.redis.scard(f"followers:{user_id}"),
                'following_count': self.redis.scard(f"following:{user_id}"),
                'followers': list(self.redis.smembers(f"followers:{user_id}")),
                'following': list(self.redis.smembers(f"following:{user_id}"))
            }

        return {
            'follow': follow_user,
            'unfollow': unfollow_user,
            'mutual_followers': get_mutual_followers,
            'suggested_follows': get_suggested_follows,
            'user_stats': get_user_stats
        }

# Advanced Sorted Set Operations
class RedisSortedSetOperations:
    def __init__(self, redis_client):
        self.redis = redis_client

    # Pattern 1: Real-time Leaderboards with Time Windows
    def advanced_leaderboards(self):
        """Multi-dimensional leaderboards with time windows"""

        def update_score(user_id, score, game_mode='default'):
            current_time = time.time()

            # Global leaderboard
            global_key = f"leaderboard:global:{game_mode}"
            self.redis.zadd(global_key, {user_id: score})

            # Daily leaderboard
            today = datetime.now().strftime('%Y-%m-%d')
            daily_key = f"leaderboard:daily:{today}:{game_mode}"
            self.redis.zadd(daily_key, {user_id: score})
            self.redis.expire(daily_key, 2 * 24 * 3600)  # Keep for 2 days

            # Weekly leaderboard
            week = datetime.now().strftime('%Y-W%U')
            weekly_key = f"leaderboard:weekly:{week}:{game_mode}"
            self.redis.zadd(weekly_key, {user_id: score})
            self.redis.expire(weekly_key, 8 * 24 * 3600)  # Keep for 8 days

            # Time-series score tracking
            score_history_key = f"scores:{user_id}:{game_mode}"
            self.redis.zadd(score_history_key, {current_time: score})

            # Keep only last 100 scores
            total_scores = self.redis.zcard(score_history_key)
            if total_scores > 100:
                self.redis.zremrangebyrank(score_history_key, 0, total_scores - 101)

        def get_leaderboard(leaderboard_type='global', game_mode='default', limit=10):
            """Get leaderboard with ranks and scores"""

            if leaderboard_type == 'daily':
                today = datetime.now().strftime('%Y-%m-%d')
                key = f"leaderboard:daily:{today}:{game_mode}"
            elif leaderboard_type == 'weekly':
                week = datetime.now().strftime('%Y-W%U')
                key = f"leaderboard:weekly:{week}:{game_mode}"
            else:
                key = f"leaderboard:global:{game_mode}"

            # Get top players with scores
            top_players = self.redis.zrevrange(key, 0, limit - 1, withscores=True)

            leaderboard = []
            for rank, (user_id, score) in enumerate(top_players, 1):
                leaderboard.append({
                    'rank': rank,
                    'user_id': user_id,
                    'score': int(score)
                })

            return leaderboard

        def get_user_rank(user_id, leaderboard_type='global', game_mode='default'):
            """Get user's rank and nearby players"""

            if leaderboard_type == 'daily':
                today = datetime.now().strftime('%Y-%m-%d')
                key = f"leaderboard:daily:{today}:{game_mode}"
            elif leaderboard_type == 'weekly':
                week = datetime.now().strftime('%Y-W%U')
                key = f"leaderboard:weekly:{week}:{game_mode}"
            else:
                key = f"leaderboard:global:{game_mode}"

            # Get user's rank (0-based, so add 1)
            rank = self.redis.zrevrank(key, user_id)
            if rank is None:
                return None

            rank += 1  # Convert to 1-based ranking
            score = self.redis.zscore(key, user_id)

            # Get players around this user
            start_rank = max(0, rank - 3)  # 2 players above
            end_rank = rank + 2  # 2 players below

            nearby_players = self.redis.zrevrange(
                key, start_rank, end_rank, withscores=True
            )

            context = []
            for i, (player_id, player_score) in enumerate(nearby_players):
                context.append({
                    'rank': start_rank + i + 1,
                    'user_id': player_id,
                    'score': int(player_score),
                    'is_current_user': player_id == user_id
                })

            return {
                'user_rank': rank,
                'user_score': int(score),
                'total_players': self.redis.zcard(key),
                'context': context
            }

        return {
            'update_score': update_score,
            'get_leaderboard': get_leaderboard,
            'get_user_rank': get_user_rank
        }

    # Pattern 2: Trending Content System
    def trending_system(self):
        """Trending content with decay scoring"""

        def add_interaction(content_id, interaction_type, user_id):
            """Add user interaction with content"""
            current_time = time.time()

            # Different weights for different interactions
            weights = {
                'view': 1,
                'like': 5,
                'share': 10,
                'comment': 15
            }

            weight = weights.get(interaction_type, 1)

            # Time decay factor (newer content gets higher scores)
            hours_old = (current_time - (current_time % 3600)) / 3600
            time_decay = max(0.1, 1.0 - (hours_old * 0.1))  # Decay over 10 hours

            final_score = weight * time_decay

            # Add to trending sorted set
            trending_key = "trending:content"
            self.redis.zincrby(trending_key, final_score, content_id)

            # Track interaction details
            interaction_key = f"interactions:{content_id}"
            interaction_data = {
                'type': interaction_type,
                'user_id': user_id,
                'timestamp': current_time,
                'score': final_score
            }

            self.redis.zadd(interaction_key, {
                json.dumps(interaction_data): current_time
            })

            # Keep only recent interactions (24 hours)
            cutoff_time = current_time - (24 * 3600)
            self.redis.zremrangebyscore(interaction_key, 0, cutoff_time)

        def get_trending_content(limit=20, category=None):
            """Get trending content with scores"""

            if category:
                trending_key = f"trending:content:{category}"
            else:
                trending_key = "trending:content"

            trending_items = self.redis.zrevrange(
                trending_key, 0, limit - 1, withscores=True
            )

            results = []
            for content_id, score in trending_items:
                # Get interaction stats
                interaction_key = f"interactions:{content_id}"
                interaction_count = self.redis.zcard(interaction_key)

                results.append({
                    'content_id': content_id,
                    'trending_score': round(score, 2),
                    'interaction_count': interaction_count
                })

            return results

        def decay_trending_scores():
            """Periodic decay of trending scores (run as background job)"""
            trending_key = "trending:content"

            # Get all items
            all_items = self.redis.zrange(trending_key, 0, -1, withscores=True)

            # Apply decay factor
            decay_factor = 0.9  # 10% decay

            for content_id, score in all_items:
                new_score = score * decay_factor

                if new_score < 0.1:  # Remove items with very low scores
                    self.redis.zrem(trending_key, content_id)
                else:
                    self.redis.zadd(trending_key, {content_id: new_score})

        return {
            'add_interaction': add_interaction,
            'get_trending': get_trending_content,
            'decay_scores': decay_trending_scores
        }
```

**📊 Redis Data Structure Selection Guide:**

| Use Case            | Best Structure | Why                                 |
| ------------------- | -------------- | ----------------------------------- |
| **User Sessions**   | Hash           | Multiple related fields per session |
| **Shopping Cart**   | Hash           | Items with properties (qty, price)  |
| **Leaderboards**    | Sorted Set     | Automatic ranking by score          |
| **Tags/Categories** | Set            | Unique membership, set operations   |
| **Activity Feed**   | List           | Ordered timeline, recent first      |
| **Counters**        | String         | Atomic increment operations         |
| **Unique Counts**   | HyperLogLog    | Memory-efficient cardinality        |

---

## Advanced Caching Patterns

### Cache-Aside Pattern Implementation

```python
import redis
import json
import hashlib
from datetime import datetime, timedelta
from functools import wraps

class AdvancedCacheManager:
    def __init__(self, redis_client, default_ttl=3600):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self.hit_count = 0
        self.miss_count = 0

    def generate_cache_key(self, prefix, *args, **kwargs):
        """Generate consistent cache key from arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"cache:{prefix}:{key_hash}"

    def cache_with_refresh(self, prefix, ttl=None, refresh_ahead_factor=0.8):
        """Decorator for cache-aside with refresh-ahead"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = self.generate_cache_key(prefix, *args, **kwargs)
                cache_ttl = ttl or self.default_ttl

                # Try to get from cache
                cached_data = self.redis.get(cache_key)

                if cached_data:
                    self.hit_count += 1
                    data = json.loads(cached_data)

                    # Check if we should refresh ahead
                    remaining_ttl = self.redis.ttl(cache_key)
                    refresh_threshold = cache_ttl * refresh_ahead_factor

                    if remaining_ttl < refresh_threshold:
                        # Refresh in background (simplified - in practice use task queue)
                        try:
                            fresh_data = func(*args, **kwargs)
                            self.redis.setex(
                                cache_key,
                                cache_ttl,
                                json.dumps(fresh_data, default=str)
                            )
                        except Exception as e:
                            print(f"Background refresh failed: {e}")

                    return data
                else:
                    self.miss_count += 1
                    # Cache miss - fetch and store
                    data = func(*args, **kwargs)
                    self.redis.setex(
                        cache_key,
                        cache_ttl,
                        json.dumps(data, default=str)
                    )
                    return data

            return wrapper
        return decorator

    def cached_with_tags(self, tags, ttl=None):
        """Cache with tag-based invalidation"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = self.generate_cache_key(func.__name__, *args, **kwargs)
                cache_ttl = ttl or self.default_ttl

                # Check cache
                cached_data = self.redis.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)

                # Cache miss
                data = func(*args, **kwargs)

                # Store data
                self.redis.setex(
                    cache_key,
                    cache_ttl,
                    json.dumps(data, default=str)
                )

                # Associate with tags
                for tag in tags:
                    tag_key = f"tag:{tag}"
                    self.redis.sadd(tag_key, cache_key)
                    self.redis.expire(tag_key, cache_ttl)

                return data

            return wrapper
        return decorator

    def invalidate_by_tag(self, tag):
        """Invalidate all cache entries with specific tag"""
        tag_key = f"tag:{tag}"
        cache_keys = self.redis.smembers(tag_key)

        if cache_keys:
            # Delete all cache entries
            self.redis.delete(*cache_keys)
            # Delete the tag set
            self.redis.delete(tag_key)

        return len(cache_keys)

    def get_cache_stats(self):
        """Get cache performance statistics"""
        total_requests = self.hit_count + self.miss_count
        hit_ratio = self.hit_count / total_requests if total_requests > 0 else 0

        return {
            'hits': self.hit_count,
            'misses': self.miss_count,
            'hit_ratio': round(hit_ratio * 100, 2),
            'total_requests': total_requests
        }

# Usage examples
cache_manager = AdvancedCacheManager(redis_client)

# Database access with caching
@cache_manager.cache_with_refresh('user_profile', ttl=1800)  # 30 minutes
def get_user_profile(user_id):
    """Simulate expensive database call"""
    print(f"Fetching user profile from database: {user_id}")
    # Simulate database query
    time.sleep(0.1)
    return {
        'user_id': user_id,
        'name': f'User {user_id}',
        'email': f'user{user_id}@example.com',
        'last_login': datetime.now().isoformat()
    }

@cache_manager.cached_with_tags(['products', 'inventory'], ttl=600)  # 10 minutes
def get_product_details(product_id):
    """Get product details with tag-based invalidation"""
    print(f"Fetching product from database: {product_id}")
    return {
        'product_id': product_id,
        'name': f'Product {product_id}',
        'price': 99.99,
        'stock': 25
    }

# When inventory changes, invalidate related caches
def update_product_inventory(product_id, new_stock):
    # Update database
    print(f"Updating inventory for product {product_id}: {new_stock}")

    # Invalidate related caches
    cache_manager.invalidate_by_tag('inventory')
    cache_manager.invalidate_by_tag('products')
```

### Write-Through and Write-Behind Patterns

```python
class AdvancedWritePatterns:
    def __init__(self, redis_client, database_client):
        self.redis = redis_client
        self.db = database_client
        self.write_queue = "write_queue"

    # Write-Through Pattern
    def write_through_update(self, user_id, user_data):
        """Write-through: Update cache and database synchronously"""
        cache_key = f"user:{user_id}"

        try:
            # Update database first
            self.db.update_user(user_id, user_data)

            # Update cache
            self.redis.setex(
                cache_key,
                3600,
                json.dumps(user_data, default=str)
            )

            return True, "Update successful"

        except Exception as e:
            # If database update fails, don't update cache
            return False, f"Update failed: {e}"

    # Write-Behind Pattern
    def write_behind_update(self, user_id, user_data):
        """Write-behind: Update cache immediately, queue database update"""
        cache_key = f"user:{user_id}"

        # Update cache immediately
        self.redis.setex(
            cache_key,
            3600,
            json.dumps(user_data, default=str)
        )

        # Queue database update
        write_task = {
            'operation': 'update_user',
            'user_id': user_id,
            'data': user_data,
            'timestamp': datetime.now().isoformat()
        }

        self.redis.lpush(self.write_queue, json.dumps(write_task, default=str))

        return True, "Update queued"

    def process_write_queue(self):
        """Background worker to process write-behind queue"""
        while True:
            # Block and wait for tasks
            task_data = self.redis.brpop(self.write_queue, timeout=10)

            if task_data:
                try:
                    task = json.loads(task_data[1])

                    if task['operation'] == 'update_user':
                        self.db.update_user(task['user_id'], task['data'])
                        print(f"Database updated for user {task['user_id']}")

                except Exception as e:
                    print(f"Write-behind error: {e}")
                    # In production, you might want to retry or log to dead letter queue

            time.sleep(0.1)

# Multi-level Caching Strategy
class MultiLevelCache:
    def __init__(self, redis_client, local_cache_size=1000):
        self.redis = redis_client
        self.local_cache = {}  # L1 cache (in-memory)
        self.local_cache_size = local_cache_size
        self.access_order = []  # For LRU

    def get(self, key):
        """Get from multi-level cache (L1 -> L2 -> Database)"""

        # L1 Cache (Local memory)
        if key in self.local_cache:
            self._update_access_order(key)
            return self.local_cache[key], 'L1'

        # L2 Cache (Redis)
        redis_data = self.redis.get(f"cache:{key}")
        if redis_data:
            data = json.loads(redis_data)
            self._store_in_local_cache(key, data)
            return data, 'L2'

        # Cache miss - would fetch from database
        return None, 'MISS'

    def set(self, key, value, ttl=3600):
        """Set in both cache levels"""

        # Store in Redis (L2)
        self.redis.setex(f"cache:{key}", ttl, json.dumps(value, default=str))

        # Store in local cache (L1)
        self._store_in_local_cache(key, value)

    def _store_in_local_cache(self, key, value):
        """Store in L1 cache with LRU eviction"""

        if len(self.local_cache) >= self.local_cache_size:
            # Evict least recently used
            lru_key = self.access_order.pop(0)
            del self.local_cache[lru_key]

        self.local_cache[key] = value
        self._update_access_order(key)

    def _update_access_order(self, key):
        """Update LRU order"""
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)

    def invalidate(self, key):
        """Invalidate from both cache levels"""
        # Remove from local cache
        if key in self.local_cache:
            del self.local_cache[key]
            self.access_order.remove(key)

        # Remove from Redis
        self.redis.delete(f"cache:{key}")

    def get_stats(self):
        """Get cache statistics"""
        return {
            'l1_size': len(self.local_cache),
            'l1_capacity': self.local_cache_size,
            'l1_utilization': len(self.local_cache) / self.local_cache_size * 100,
            'redis_memory_usage': self.redis.info('memory')['used_memory_human']
        }
```

**📊 Caching Pattern Selection:**

| Pattern           | Use Case                 | Pros              | Cons                            |
| ----------------- | ------------------------ | ----------------- | ------------------------------- |
| **Cache-Aside**   | Read-heavy workloads     | Simple, flexible  | Cache misses impact performance |
| **Write-Through** | Strong consistency needs | Always consistent | Higher write latency            |
| **Write-Behind**  | High write throughput    | Fast writes       | Eventual consistency            |
| **Multi-Level**   | Mixed workloads          | Best performance  | Complex invalidation            |

---

## Performance Optimization

### Redis Performance Tuning

```python
# Redis configuration optimization
redis_config = {
    # Memory optimization
    'maxmemory': '2gb',
    'maxmemory-policy': 'allkeys-lru',  # LRU eviction for all keys
    'save': '900 1 300 10 60 10000',    # Persistence strategy

    # Network optimization
    'tcp-keepalive': 300,
    'timeout': 0,
    'tcp-backlog': 511,

    # Performance tuning
    'databases': 1,  # Use single database for better performance
    'rdbcompression': 'yes',
    'rdbchecksum': 'yes',

    # Memory allocation
    'hash-max-ziplist-entries': 512,
    'hash-max-ziplist-value': 64,
    'list-max-ziplist-size': -2,
    'set-max-intset-entries': 512,
    'zset-max-ziplist-entries': 128,
    'zset-max-ziplist-value': 64,

    # Latency optimization
    'latency-monitor-threshold': 100,  # Monitor operations > 100ms

    # Security
    'protected-mode': 'yes',
    'requirepass': 'strong_password_here'
}

class RedisPerformanceOptimizer:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.performance_metrics = {}

    def optimize_pipeline_operations(self):
        """Demonstrate efficient bulk operations"""

        # ❌ BAD: Individual operations
        start_time = time.time()
        for i in range(1000):
            self.redis.set(f"key:{i}", f"value:{i}")
        individual_time = time.time() - start_time

        # ✅ GOOD: Pipeline operations
        start_time = time.time()
        pipe = self.redis.pipeline()
        for i in range(1000):
            pipe.set(f"key_pipe:{i}", f"value:{i}")
        pipe.execute()
        pipeline_time = time.time() - start_time

        return {
            'individual_operations_time': round(individual_time, 3),
            'pipeline_operations_time': round(pipeline_time, 3),
            'improvement_factor': round(individual_time / pipeline_time, 2)
        }

    def memory_optimization_techniques(self):
        """Memory optimization strategies"""

        # Use hashes for objects instead of individual keys
        user_id = 12345

        # ❌ BAD: Multiple keys for user data
        self.redis.set(f"user:{user_id}:name", "John Doe")
        self.redis.set(f"user:{user_id}:email", "john@example.com")
        self.redis.set(f"user:{user_id}:age", 30)

        # ✅ GOOD: Single hash for user data
        self.redis.hset(f"user:{user_id}", mapping={
            'name': 'John Doe',
            'email': 'john@example.com',
            'age': 30
        })

        # Use appropriate data structures
        # For small lists, use hash with numeric fields
        # For large lists, use actual lists

        small_list_key = "small_list"
        large_list_key = "large_list"

        # Small list as hash (memory efficient for < 512 entries)
        for i in range(10):
            self.redis.hset(small_list_key, str(i), f"item_{i}")

        # Large list as actual list
        for i in range(1000):
            self.redis.lpush(large_list_key, f"item_{i}")

    def connection_pool_optimization(self):
        """Optimize connection pooling"""

        # Optimized connection pool configuration
        pool = redis.ConnectionPool(
            host='localhost',
            port=6379,
            max_connections=20,  # Adjust based on concurrent needs
            retry_on_timeout=True,
            socket_keepalive=True,
            socket_keepalive_options={},
            health_check_interval=30,
            connection_kwargs={
                'socket_connect_timeout': 5,
                'socket_timeout': 5,
            }
        )

        return redis.Redis(connection_pool=pool)

    def lua_script_optimization(self):
        """Use Lua scripts for atomic operations"""

        # Atomic increment with maximum value
        increment_with_max_script = self.redis.register_script("""
            local key = KEYS[1]
            local increment = tonumber(ARGV[1])
            local max_value = tonumber(ARGV[2])

            local current = redis.call('GET', key)
            if current == false then
                current = 0
            else
                current = tonumber(current)
            end

            local new_value = current + increment
            if new_value <= max_value then
                redis.call('SET', key, new_value)
                return new_value
            else
                return current
            end
        """)

        # Rate limiting with sliding window
        rate_limit_script = self.redis.register_script("""
            local key = KEYS[1]
            local window = tonumber(ARGV[1])
            local limit = tonumber(ARGV[2])
            local current_time = tonumber(ARGV[3])

            -- Remove old entries
            redis.call('ZREMRANGEBYSCORE', key, 0, current_time - window)

            -- Count current requests
            local current_requests = redis.call('ZCARD', key)

            if current_requests < limit then
                -- Add current request
                redis.call('ZADD', key, current_time, current_time)
                redis.call('EXPIRE', key, window)
                return {1, current_requests + 1}
            else
                return {0, current_requests}
            end
        """)

        return {
            'increment_with_max': increment_with_max_script,
            'rate_limit': rate_limit_script
        }

    def monitor_performance(self):
        """Monitor Redis performance metrics"""

        info = self.redis.info()

        metrics = {
            'memory': {
                'used_memory': info['used_memory'],
                'used_memory_human': info['used_memory_human'],
                'used_memory_rss': info['used_memory_rss'],
                'mem_fragmentation_ratio': info['mem_fragmentation_ratio']
            },
            'performance': {
                'total_commands_processed': info['total_commands_processed'],
                'instantaneous_ops_per_sec': info['instantaneous_ops_per_sec'],
                'keyspace_hits': info['keyspace_hits'],
                'keyspace_misses': info['keyspace_misses'],
                'hit_ratio': info['keyspace_hits'] / (info['keyspace_hits'] + info['keyspace_misses']) * 100
            },
            'connections': {
                'connected_clients': info['connected_clients'],
                'blocked_clients': info['blocked_clients'],
                'total_connections_received': info['total_connections_received']
            },
            'persistence': {
                'rdb_changes_since_last_save': info['rdb_changes_since_last_save'],
                'rdb_last_save_time': info['rdb_last_save_time'],
                'aof_enabled': info.get('aof_enabled', 0)
            }
        }

        # Performance alerts
        alerts = []

        if metrics['memory']['mem_fragmentation_ratio'] > 1.5:
            alerts.append("High memory fragmentation - consider restart")

        if metrics['performance']['hit_ratio'] < 80:
            alerts.append("Low cache hit ratio - review caching strategy")

        if metrics['connections']['connected_clients'] > 100:
            alerts.append("High connection count - check for connection leaks")

        metrics['alerts'] = alerts

        return metrics

    def benchmark_operations(self):
        """Benchmark different Redis operations"""

        operations = {
            'string_set': lambda: self.redis.set('bench_key', 'value'),
            'string_get': lambda: self.redis.get('bench_key'),
            'hash_set': lambda: self.redis.hset('bench_hash', 'field', 'value'),
            'hash_get': lambda: self.redis.hget('bench_hash', 'field'),
            'list_push': lambda: self.redis.lpush('bench_list', 'value'),
            'list_pop': lambda: self.redis.lpop('bench_list'),
            'set_add': lambda: self.redis.sadd('bench_set', 'member'),
            'zset_add': lambda: self.redis.zadd('bench_zset', {'member': 1})
        }

        results = {}
        iterations = 10000

        for op_name, operation in operations.items():
            start_time = time.time()

            for _ in range(iterations):
                operation()

            end_time = time.time()

            results[op_name] = {
                'total_time': round(end_time - start_time, 3),
                'ops_per_second': round(iterations / (end_time - start_time), 0),
                'avg_latency_ms': round((end_time - start_time) * 1000 / iterations, 3)
            }

        return results

# Usage
optimizer = RedisPerformanceOptimizer(redis_client)

# Run optimizations and benchmarks
pipeline_results = optimizer.optimize_pipeline_operations()
performance_metrics = optimizer.monitor_performance()
benchmark_results = optimizer.benchmark_operations()

print(f"Pipeline improvement: {pipeline_results['improvement_factor']}x faster")
print(f"Cache hit ratio: {performance_metrics['performance']['hit_ratio']:.2f}%")
```

**📊 Redis Performance Best Practices:**

✅ **Memory Optimization:**

- Use hashes for objects (memory efficient for < 512 fields)
- Configure appropriate ziplist/intset thresholds
- Monitor memory fragmentation ratio
- Use appropriate eviction policies

✅ **Network Optimization:**

- Use connection pooling
- Batch operations with pipelines
- Minimize network round trips
- Use Lua scripts for atomic operations

✅ **Persistence Optimization:**

- Choose appropriate persistence strategy (RDB vs AOF)
- Configure save intervals based on data importance
- Use background saves to minimize blocking

---

## Summary & Key Takeaways

### 🎯 Redis Mastery Points

✅ **Data Structures**: Master each Redis data type for optimal use cases  
✅ **Caching Patterns**: Implement appropriate caching strategies for your workload  
✅ **Performance**: Optimize memory usage, network operations, and persistence  
✅ **High Availability**: Design for failure with clustering and replication  
✅ **Monitoring**: Track performance metrics and set up alerting

### 📈 Redis Best Practices

1. **Choose Right Data Structure**

   - Strings for simple key-value and counters
   - Hashes for objects and structured data
   - Lists for queues and activity feeds
   - Sets for unique membership and relationships
   - Sorted Sets for rankings and time-series

2. **Optimize for Performance**

   - Use pipelines for bulk operations
   - Implement connection pooling
   - Monitor memory usage and fragmentation
   - Use Lua scripts for atomic operations

3. **Design for Scale**
   - Implement proper caching patterns
   - Plan for data growth and eviction
   - Use clustering for horizontal scaling
   - Monitor and alert on key metrics

### ⚠️ Common Redis Pitfalls

- **Wrong data structure choice**: Using lists when sets would be better
- **No connection pooling**: Creating new connections for each operation
- **Ignoring memory limits**: Not setting eviction policies
- **Poor key naming**: Making debugging and monitoring difficult
- **No monitoring**: Missing performance degradation signs

**📈 Next Steps:**
Ready to secure and deploy your databases? Continue with [Database Security & Production Readiness](./08-database-security-production.md) to learn about authentication, encryption, backup strategies, and production deployment patterns.

---

_💡 Pro Tip: Redis performance is all about choosing the right data structure for your use case and minimizing network round trips. When in doubt, benchmark different approaches with your actual data patterns._
