from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class RouteRequest(BaseModel):
    source: str
    destination: str

@app.get("/")
def home():
    return {"message": "Backend running 🚀"}

@app.post("/get_route")
def get_route(data: RouteRequest):
    return {
        "fastest": [{"route": ["walk", "bus"], "duration": 20, "price": 10}],
        "cheapest": [{"route": ["walk"], "duration": 35, "price": 0}],
        "optimal": [{"route": ["walk", "metro"], "duration": 25, "price": 8}]
    }