FROM langchain/langgraph-api:3.12

# Add agent source
ADD apps/agent /deps/agent
RUN PYTHONDONTWRITEBYTECODE=1 pip install --no-cache-dir -c /api/constraints.txt -e /deps/agent

# Configure graphs
ENV LANGSERVE_GRAPHS='{"sample_agent": "/deps/agent/main.py:graph"}'

WORKDIR /deps/agent
