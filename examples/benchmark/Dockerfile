# run below command on M1 mac to build image for linux/amd64
FROM --platform=linux/amd64 python:3-alpine   

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY standalone-data-generator/ /app
COPY create_benchmark_events.py /app
COPY configure.py /app
COPY requirements.txt /app
COPY amplifyconfiguration.json /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN ls -la /app

# Set the default command to run when the container starts
CMD ["python", "create_benchmark_events.py"]