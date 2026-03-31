import httpx
from config import settings

BOLNA_BASE_URL = "https://api.bolna.ai"


def _get_headers():
    """Return authorization headers for Bolna API."""
    return {
        "Authorization": f"Bearer {settings.BOLNA_API_KEY}",
        "Content-Type": "application/json",
    }


async def make_call(agent_id: str, phone_number: str, user_data: dict) -> dict:
    """
    Trigger a voice call via Bolna API.

    Args:
        agent_id: The Bolna agent ID to use
        phone_number: Recipient phone number (with country code)
        user_data: Dynamic variables to inject into the agent prompt

    Returns:
        Bolna API response dict with execution_id
    """
    payload = {
        "agent_id": agent_id,
        "recipient_phone_number": phone_number,
        "user_data": user_data,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BOLNA_BASE_URL}/call",
            json=payload,
            headers=_get_headers(),
        )
        response.raise_for_status()
        return response.json()


async def get_execution(execution_id: str) -> dict:
    """
    Get execution details from Bolna API.

    Args:
        execution_id: The Bolna execution ID

    Returns:
        Execution details dict
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{BOLNA_BASE_URL}/execution/{execution_id}",
            headers=_get_headers(),
        )
        response.raise_for_status()
        return response.json()
