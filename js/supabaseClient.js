class ApiQuery {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.payload = null;
    this.filters = {};
    this.orderBy = null;
    this.singleResult = false;
    this.allowNull = false;
  }

  select() {
    this.action = 'select';
    return this;
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    this.allowNull = true;
    return this;
  }

  insert(payload) {
    this.action = 'insert';
    this.payload = payload;
    return this.execute();
  }

  update(payload) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(payload) {
    this.action = 'upsert';
    this.payload = payload;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    try {
      const endpoint = getEndpoint(this.table);
      const response = await fetch(endpoint, {
        method: getMethod(this.action),
        headers: { 'Content-Type': 'application/json' },
        body: this.action === 'select'
          ? undefined
          : JSON.stringify({
              ...this.payloadForRequest(),
              filters: this.filters
            })
      });

      const result = await readJson(response);

      if (!response.ok) {
        return { data: null, error: new Error(result?.error || 'Error en la API') };
      }

      let data = result;
      if (this.action === 'select') {
        data = this.applyClientSideQuery(Array.isArray(result) ? result : result ? [result] : []);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  payloadForRequest() {
    if (this.action === 'delete') return {};
    if (this.action === 'update') return { data: this.payload };
    return this.payload || {};
  }

  applyClientSideQuery(rows) {
    let data = rows;

    Object.entries(this.filters).forEach(([column, value]) => {
      data = data.filter((row) => String(row[column]) === String(value));
    });

    if (this.orderBy) {
      const direction = this.orderBy.ascending ? 1 : -1;
      data = [...data].sort((a, b) => {
        const aValue = a[this.orderBy.column] || '';
        const bValue = b[this.orderBy.column] || '';
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
    }

    if (this.singleResult) {
      return data[0] || null;
    }

    return data;
  }
}

function getEndpoint(table) {
  if (table === 'proyectos') return '/api/proyectos';
  if (table === 'site_config') return '/api/site-config';
  throw new Error(`Tabla no soportada: ${table}`);
}

function getMethod(action) {
  if (action === 'insert') return 'POST';
  if (action === 'update') return 'PATCH';
  if (action === 'delete') return 'DELETE';
  if (action === 'upsert') return 'PUT';
  return 'GET';
}

async function readJson(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('Content-Type') || '';
  const text = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error('La API de Neon no devolvio JSON. Verifica DATABASE_URL y reinicia npm run dev.');
  }

  return text ? JSON.parse(text) : null;
}

const uploadedFiles = new Map();

function getPublicUrl(path) {
  return { data: { publicUrl: uploadedFiles.get(path) || path } };
}

async function upload(path, file) {
  try {
    const dataUrl = await fileToDataUrl(file);
    uploadedFiles.set(path, dataUrl);
    return { data: { path: dataUrl }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

export const supabase = {
  from(table) {
    return new ApiQuery(table);
  },
  storage: {
    from() {
      return { upload, getPublicUrl };
    }
  }
};
