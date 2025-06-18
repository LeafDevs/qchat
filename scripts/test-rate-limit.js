async function makeRequest() {
    try {
        const response = await fetch('http://localhost:3000/api/chat/list?userId=7VzZMf7v3pTyssDpjEfhWYlzcsc3aDso', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const headers = response.headers;
        console.log('\nRequest Status:', response.status);
        console.log('Rate Limit Headers:');
        console.log('X-RateLimit-Limit:', headers.get('x-ratelimit-limit'));
        console.log('X-RateLimit-Remaining:', headers.get('x-ratelimit-remaining'));
        console.log('X-RateLimit-Reset:', new Date(parseInt(headers.get('x-ratelimit-reset'))).toLocaleTimeString());

        // Always log the response body
        const data = await response.json();
        console.log('Response Body:', data);

        if (!response.ok) {
            console.log('Error Response:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runTest() {
    console.log('Starting rate limit test...');
    console.log('Making 20 requests in quick succession...\n');

    // Make 20 requests sequentially instead of parallel
    for (let i = 0; i < 20; i++) {
        await makeRequest();
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\nWaiting 30 seconds before next batch...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('\nMaking 5 more requests after waiting...\n');
    // Make 5 requests sequentially
    for (let i = 0; i < 5; i++) {
        await makeRequest();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

runTest().catch(console.error);