// Cloudflare Pages Functions - API handler for edge deployment
// This allows the API to run on Cloudflare's edge network

export async function onRequest(context: {
  request: Request;
  env: {
    DB: D1Database;
    CACHE: KVNamespace;
    UPLOADS: R2Bucket;
    DATABASE_URL?: string;
  };
  params: { path: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = params.path?.join('/') || '';

  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Route handling
  try {
    // Health check endpoint
    if (path === 'health') {
      return new Response(JSON.stringify({ status: 'healthy', edge: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cases endpoints
    if (path.startsWith('cases')) {
      return handleCasesEndpoint(request, env, path);
    }

    // Timeline endpoints
    if (path.startsWith('timeline')) {
      return handleTimelineEndpoint(request, env, path);
    }

    // ChittyPM integration endpoints
    if (path.startsWith('chittypm')) {
      return handleChittyPmEndpoint(request, env, path);
    }

    // Export endpoints
    if (path.startsWith('export')) {
      return handleExportEndpoint(request, env, path);
    }

    // Not found
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleCasesEndpoint(
  request: Request,
  env: any,
  path: string
): Promise<Response> {
  const method = request.method;
  const segments = path.split('/');

  // GET /api/cases
  if (method === 'GET' && segments.length === 1) {
    // Check cache first
    const cacheKey = `cases:list`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        },
      });
    }

    // Query D1 database
    const result = await env.DB.prepare(
      'SELECT * FROM cases ORDER BY created_at DESC'
    ).all();

    const response = JSON.stringify(result.results);
    
    // Cache for 5 minutes
    await env.CACHE.put(cacheKey, response, { expirationTtl: 300 });

    return new Response(response, {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      },
    });
  }

  // POST /api/cases
  if (method === 'POST' && segments.length === 1) {
    const body = await request.json();
    
    // Insert into D1 database
    const result = await env.DB.prepare(
      'INSERT INTO cases (case_name, case_number, jurisdiction, created_by) VALUES (?, ?, ?, ?)'
    ).bind(
      body.caseName,
      body.caseNumber,
      body.jurisdiction,
      body.createdBy
    ).run();

    // Invalidate cache
    await env.CACHE.delete('cases:list');

    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleTimelineEndpoint(
  request: Request,
  env: any,
  path: string
): Promise<Response> {
  const method = request.method;
  const segments = path.split('/');

  // GET /api/timeline/entries
  if (method === 'GET' && segments[1] === 'entries') {
    const url = new URL(request.url);
    const caseId = url.searchParams.get('caseId');
    
    if (!caseId) {
      return new Response(JSON.stringify({ error: 'caseId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check cache
    const cacheKey = `timeline:${caseId}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        },
      });
    }

    // Query database
    const result = await env.DB.prepare(
      'SELECT * FROM timeline_entries WHERE case_id = ? AND deleted_at IS NULL ORDER BY date DESC'
    ).bind(caseId).all();

    const response = JSON.stringify({
      entries: result.results,
      totalCount: result.results.length
    });

    // Cache for 2 minutes
    await env.CACHE.put(cacheKey, response, { expirationTtl: 120 });

    return new Response(response, {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      },
    });
  }

  // POST /api/timeline/entries
  if (method === 'POST' && segments[1] === 'entries') {
    const body = await request.json();
    
    // Generate ChittyID
    const chittyId = `CT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    
    // Insert into database
    const result = await env.DB.prepare(
      `INSERT INTO timeline_entries 
       (chitty_id, case_id, entry_type, date, description, confidence_level, created_by, modified_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      chittyId,
      body.caseId,
      body.entryType,
      body.date,
      body.description,
      body.confidenceLevel,
      body.createdBy,
      body.modifiedBy
    ).run();

    // Invalidate cache
    await env.CACHE.delete(`timeline:${body.caseId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      entry: { id: result.meta.last_row_id, chittyId } 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleChittyPmEndpoint(
  request: Request,
  env: any,
  path: string
): Promise<Response> {
  // Proxy requests to ChittyPM service
  const chittyPmUrl = env.CHITTYPM_URL || 'https://api.chittypm.com';
  const proxyUrl = `${chittyPmUrl}/${path}`;
  
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const response = await fetch(proxyRequest);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function handleExportEndpoint(
  request: Request,
  env: any,
  path: string
): Promise<Response> {
  const segments = path.split('/');
  const caseId = segments[1];
  const format = segments[2] || 'json';

  if (!caseId) {
    return new Response(JSON.stringify({ error: 'caseId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch timeline data
  const timeline = await env.DB.prepare(
    'SELECT * FROM timeline_entries WHERE case_id = ? AND deleted_at IS NULL ORDER BY date'
  ).bind(caseId).all();

  // Fetch case data
  const caseData = await env.DB.prepare(
    'SELECT * FROM cases WHERE id = ?'
  ).bind(caseId).first();

  if (format === 'csv') {
    const csv = generateCSV(timeline.results);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="timeline_${caseId}.csv"`,
      },
    });
  }

  // Default to JSON
  return new Response(JSON.stringify({
    case: caseData,
    timeline: timeline.results,
    exportDate: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateCSV(entries: any[]): string {
  const headers = ['Date', 'Type', 'Description', 'Status', 'Confidence'];
  const rows = entries.map(entry => [
    entry.date,
    entry.entry_type,
    entry.description,
    entry.event_status || entry.task_status || '',
    entry.confidence_level,
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}