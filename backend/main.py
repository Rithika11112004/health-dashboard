import os
import random
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Health Monitoring API")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project-url.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your-anon-or-service-role-key")

# We wrap it in a try-except to handle cases where Supabase hasn't been configured yet
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    supabase = None
    print(f"Warning: Could not initialize Supabase client: {e}")

patients = [
    {"id": "p1", "name": "John Doe"},
    {"id": "p2", "name": "Jane Smith"},
    {"id": "p3", "name": "Alice Johnson"},
    {"id": "p4", "name": "Bob Brown"}
]

@app.get("/patients", response_model=list[Dict[str, str]])
async def get_patients():
    """Returns the list of monitored patients."""
    return patients

@app.get("/health", response_model=Dict[str, Any])
async def get_health_data(patient_id: str = None):
    """
    Generates random health data (including BP). If patient_id is provided, 
    generates data specifically for that patient. Otherwise picks a random one.
    """
    if patient_id:
        # Find the specific patient
        patient = next((p for p in patients if p["id"] == patient_id), random.choice(patients))
        patient_name = patient["name"]
    else:
        patient = random.choice(patients)
        patient_name = patient["name"]

    # Generate random data
    heart_rate = random.randint(60, 130)  # sometimes goes above 120 trigger
    temperature = round(random.uniform(97.0, 102.5), 1)
    spo2 = random.randint(85, 100)        # sometimes goes below 90 trigger
    
    # Blood Pressure Simulation
    bp_sys = random.randint(110, 150) # Sometimes > 130
    bp_dia = random.randint(70, 95)   # Sometimes > 80

    data = {
        "patient_name": patient_name,
        "patient_id": patient["id"],
        "heart_rate": heart_rate,
        "temperature": temperature,
        "spo2": spo2,
        "bp_systolic": bp_sys,
        "bp_diastolic": bp_dia
    }

    if supabase:
        try:
            # Insert into Supabase table "health_data"
            response = supabase.table("health_data").insert(data).execute()
        except Exception as e:
            # If Supabase is not set up correctly yet, we just log it and return data anyway
            print(f"Failed to insert into Supabase: {e}")
            pass

    return data

@app.get("/")
def read_root():
    return {"message": "Health Monitoring Backend API is running. Go to /health for data."}
