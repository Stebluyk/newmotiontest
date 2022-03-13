import time

from sqlmodel import Field, SQLModel


class EpochBase(SQLModel):
    timestamp: int = Field(nullable=False, default_factory=lambda: int(time.time()))


class Epoch(EpochBase, table=True):
    id: int = Field(default=None, primary_key=True)
