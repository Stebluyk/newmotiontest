import os

import boto3
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine

# connect_args = {"check_same_thread": True}

load_dotenv()
rds_host = os.environ.get("AWS_RDS_HOST")
rds_port = 5432
rds_username = os.environ.get("AWS_RDS_USER")
rds_db = os.environ.get("AWS_RDS_DB")
rds_passwd = os.environ.get("AWS_RDS_PWD")
# rds_host = "aurora-sls.cluster-cxu9o98zdhl4.us-east-1.rds.amazonaws.com"
# rds_port = 5432
# rds_username = "newmotion"
# rds_db = "dbname"
# rds_passwd = "password"
# database = 
#
# temp_passwd = boto3.client('rds').generate_db_auth_token(
#     DBHostname=rds_host,
#     Port=rds_port,
#     DBUsername=rds_username
# )

rds_credentials = {'user': rds_username, 'password': rds_passwd}
connect_args=rds_credentials
# db_conn_string = f"postgresql://{rds_username}{rds_passwd}@{rds_host}:{rds_port}/{rds_db}"
db_conn_string = f"postgresql+psycopg2://{rds_username}{rds_passwd}@{rds_host}:{rds_port}/{rds_db}"
# db_conn_string = "sqlite:///dev_db.db"

engine = create_engine(db_conn_string, connect_args=connect_args)
# engine = create_engine(db_conn_string)
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
