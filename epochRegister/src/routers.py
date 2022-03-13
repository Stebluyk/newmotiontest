from fastapi import APIRouter,FastAPI
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from src.db import get_session
from src.models import Epoch

router = APIRouter()

@router.post("/epoch/", response_model=Epoch)
async def create_epoch(*, session: Session = Depends(get_session)):
    epoch_obj = Epoch()
    session.add(epoch_obj)
    session.commit()
    session.refresh(epoch_obj)
    return epoch_obj

@router.get("/")
async def get_word():
    return {"message": "Hello World"}

@router.get("/epoch/{epoch_id}", response_model=Epoch)
async def get_epoch(*, session: Session = Depends(get_session), epoch_id: int):
    try:
        epoch_obj = session.exec(select(Epoch).where(Epoch.id == epoch_id)).one()
        return epoch_obj
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Item not found")
