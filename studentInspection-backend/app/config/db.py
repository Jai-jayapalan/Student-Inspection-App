import os
from pathlib import Path

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

env_file = Path(__file__).resolve().parents[2] / ".env.development"
load_dotenv(dotenv_path=env_file)

mongodb_uri = os.getenv("MONGODB_URI")
if not mongodb_uri:
    raise RuntimeError(
        f"MONGODB_URI is not configured. Set it in the environment or in {env_file}."
    )

client = AsyncIOMotorClient(
    mongodb_uri,
    tlsCAFile=certifi.where(),
)
db = client.school_inspection