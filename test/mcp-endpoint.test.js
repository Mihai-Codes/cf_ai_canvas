import assert from 'assert';

async function testMcpEndpoint() {
  const MCP_ENDPOINT = 'https://cf-ai-canvas.mc146.workers.dev/mcp';

  console.log('Testing MCP Endpoint...');

  // Test 1: Basic endpoint reachability
  console.log('\n1. Testing basic endpoint reachability...');
  try {
    const response = await fetch(MCP_ENDPOINT);
    const data = await response.json();
    
    assert.strictEqual(data.jsonrpc, '2.0', 'Should return JSON-RPC 2.0');
    assert.ok(data.error, 'Should return error object');
    assert.ok(data.error.message.includes('text/event-stream'), 'Should require text/event-stream');
    console.log('✓ Basic endpoint test passed');
  } catch (error) {
    console.error('✗ Basic endpoint test failed:', error.message);
    process.exit(1);
  }

  // Test 2: Accept header requirement
  console.log('\n2. Testing Accept header requirement...');
  try {
    const response = await fetch(MCP_ENDPOINT, {
      headers: { 'Accept': 'text/event-stream' }
    });
    const data = await response.json();
    
    assert.strictEqual(data.jsonrpc, '2.0', 'Should return JSON-RPC 2.0');
    assert.ok(data.error, 'Should return error object');
    assert.ok(data.error.message.includes('Mcp-Session-Id'), 'Should require session ID');
    console.log('✓ Accept header test passed');
  } catch (error) {
    console.error('✗ Accept header test failed:', error.message);
    process.exit(1);
  }

  // Test 3: Session ID requirement
  console.log('\n3. Testing session ID requirement...');
  try {
    const response = await fetch(MCP_ENDPOINT, {
      headers: {
        'Accept': 'text/event-stream',
        'Mcp-Session-Id': 'test-session'
      }
    });
    const data = await response.json();
    
    assert.strictEqual(data.jsonrpc, '2.0', 'Should return JSON-RPC 2.0');
    assert.ok(data.error, 'Should return error object');
    assert.strictEqual(data.error.code, -32001, 'Should return session not found error');
    assert.ok(data.error.message.includes('Session not found'), 'Should indicate session not found');
    console.log('✓ Session ID test passed');
  } catch (error) {
    console.error('✗ Session ID test failed:', error.message);
    process.exit(1);
  }

  // Test 4: JSON-RPC format
  console.log('\n4. Testing JSON-RPC error format...');
  try {
    const response = await fetch(MCP_ENDPOINT);
    const data = await response.json();
    
    assert.ok(data.hasOwnProperty('jsonrpc'), 'Should have jsonrpc property');
    assert.ok(data.hasOwnProperty('error'), 'Should have error property');
    assert.ok(data.error.hasOwnProperty('code'), 'Error should have code');
    assert.ok(data.error.hasOwnProperty('message'), 'Error should have message');
    assert.ok(data.hasOwnProperty('id'), 'Should have id property');
    console.log('✓ JSON-RPC format test passed');
  } catch (error) {
    console.error('✗ JSON-RPC format test failed:', error.message);
    process.exit(1);
  }

  console.log('\n✓ All MCP endpoint tests passed!');
}

testMcpEndpoint().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});