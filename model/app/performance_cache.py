import time
import threading
from functools import wraps
from collections import defaultdict, deque

class PerformanceCache:
    def __init__(self, max_size=1000, ttl=30):
        self.cache = {}
        self.access_times = {}
        self.max_size = max_size
        self.ttl = ttl
        self.lock = threading.RLock()
        self.metrics = defaultdict(deque)
        
    def get(self, key):
        with self.lock:
            if key in self.cache:
                # Check if expired
                if time.time() - self.access_times[key] < self.ttl:
                    return self.cache[key]
                else:
                    # Remove expired entry
                    del self.cache[key]
                    del self.access_times[key]
            return None
    
    def set(self, key, value):
        with self.lock:
            # Remove oldest entries if cache is full
            if len(self.cache) >= self.max_size:
                oldest_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
                del self.cache[oldest_key]
                del self.access_times[oldest_key]
            
            self.cache[key] = value
            self.access_times[key] = time.time()
    
    def add_metric(self, endpoint, duration):
        with self.lock:
            self.metrics[endpoint].append((time.time(), duration))
            # Keep only last 100 metrics per endpoint
            if len(self.metrics[endpoint]) > 100:
                self.metrics[endpoint].popleft()
    
    def get_average_response_time(self, endpoint):
        with self.lock:
            if endpoint not in self.metrics or not self.metrics[endpoint]:
                return 0
            durations = [duration for _, duration in self.metrics[endpoint]]
            return sum(durations) / len(durations)

# Global cache instance
performance_cache = PerformanceCache()

def cache_result(ttl=30):
    """Decorator to cache function results for performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            cached_result = performance_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            start_time = time.time()
            result = func(*args, **kwargs)
            duration = (time.time() - start_time) * 1000  # Convert to ms
            
            # Cache the result
            performance_cache.set(cache_key, result)
            
            # Record performance metric
            performance_cache.add_metric(func.__name__, duration)
            
            return result
        return wrapper
    return decorator

def performance_monitor(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = (time.time() - start_time) * 1000
            performance_cache.add_metric(func.__name__, duration)
            
            # Log slow operations
            if duration > 200:
                print(f"⚠️  Slow operation: {func.__name__} took {duration:.0f}ms")
            elif duration < 50:
                print(f"⚡ Fast operation: {func.__name__} took {duration:.0f}ms")
                
            return result
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            performance_cache.add_metric(f"{func.__name__}_error", duration)
            raise e
    return wrapper