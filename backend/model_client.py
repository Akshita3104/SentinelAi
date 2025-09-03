"""
Model Client for SentinelAI Backend

Handles communication with the DDoS detection model service.
"""
import aiohttp
import logging
import json
from typing import Dict, Any, Optional

logger = logging.getLogger('sentinelai.backend.model_client')

class ModelClient:
    """Client for interacting with the DDoS detection model service."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        """Initialize the model client."""
        self.base_url = base_url
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
            
    async def detect_ddos(self, packet_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send packet data to the model service for DDoS detection.
        
        Args:
            packet_data: Dictionary containing packet information
            
        Returns:
            Detection result from the model service
        """
        if not self.session:
            raise RuntimeError("Model client not initialized. Use async with statement.")
            
        url = f"{self.base_url}/api/v1/detect"
        
        try:
            async with self.session.post(url, json=packet_data) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Model service error: {error}")
                    return {
                        'is_attack': False,
                        'confidence': 0.0,
                        'error': f"Model service error: {error}"
                    }
                return await response.json()
                
        except Exception as e:
            logger.error(f"Error calling model service: {str(e)}")
            return {
                'is_attack': False,
                'confidence': 0.0,
                'error': f"Error calling model service: {str(e)}"
            }
            
    async def get_model_status(self) -> Dict[str, Any]:
        """Get the status of the model service."""
        if not self.session:
            raise RuntimeError("Model client not initialized. Use async with statement.")
            
        url = f"{self.base_url}/api/v1/status"
        
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Model service status error: {error}")
                    return {'status': 'error', 'message': error}
                return await response.json()
                
        except Exception as e:
            logger.error(f"Error getting model status: {str(e)}")
            return {'status': 'error', 'message': str(e)}
            
    async def mitigate_attack(self, target_ip: str, action: str, duration: int = 300) -> Dict[str, Any]:
        """
        Request mitigation action from the model service.
        
        Args:
            target_ip: IP address to mitigate
            action: Mitigation action (e.g., 'block', 'rate_limit')
            duration: Duration of mitigation in seconds (default: 300)
            
        Returns:
            Mitigation result from the model service
        """
        if not self.session:
            raise RuntimeError("Model client not initialized. Use async with statement.")
            
        url = f"{self.base_url}/api/v1/mitigate"
        payload = {
            'target_ip': target_ip,
            'action': action,
            'duration': duration
        }
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Mitigation request failed: {error}")
                    return {'success': False, 'error': error}
                return await response.json()
                
        except Exception as e:
            logger.error(f"Error in mitigation request: {str(e)}")
            return {'success': False, 'error': str(e)}


# Singleton instance
model_client = ModelClient()
