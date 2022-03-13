FROM python:3.9

ENV USER_NAME="python"
ENV APP_PORT="8000"
ENV APP_HOST="0.0.0.0"
ENV PATH="/home/${USER_NAME}/.local/bin:${PATH}"

WORKDIR /app
RUN useradd -ms /bin/bash python
RUN chown ${USER_NAME}:${USER_NAME} /app

USER python
COPY --chown=${USER_NAME}:${USER_NAME} requirements.txt requirements.txt
RUN pip install --user --no-cache-dir -r requirements.txt
COPY --chown=${USER_NAME}:${USER_NAME} src src

EXPOSE ${APP_PORT}
CMD uvicorn src.main:app --host=${APP_HOST} --port=${APP_PORT}