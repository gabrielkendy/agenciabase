// Edge Function: File Upload via Cloudinary
// Suporta arquivos até 100MB
// Runtime: Edge

export const config = {
  runtime: 'edge',
  regions: ['gru1', 'iad1'],
};

interface UploadRequest {
  file: string; // base64
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  };
}

export default async function handler(req: Request): Promise<Response> {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: UploadRequest = await req.json();
    const { file, folder = 'base-agency', resourceType = 'auto' } = body;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'File required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const config = getCloudinaryConfig();
    
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cloudinary não configurado. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET nas variáveis de ambiente.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gerar timestamp e signature
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    
    // Criar signature usando Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + config.apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Upload para Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Upload failed');
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
