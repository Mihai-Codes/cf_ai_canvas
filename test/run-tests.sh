#!/bin/bash

echo "Running MCP Endpoint Tests..."
echo "================================"

# Run the MCP endpoint tests
node test/mcp-endpoint.test.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ All tests passed successfully!"
    exit 0
else
    echo ""
    echo "✗ Some tests failed"
    exit 1
fi