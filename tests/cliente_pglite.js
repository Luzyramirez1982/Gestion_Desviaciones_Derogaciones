// Cliente "simulado" con la forma de supabase-js, pero que habla con el PostgreSQL de prueba (PGlite).
// Sirve para probar el adaptador Supabase de la aplicación contra las funciones reales de supabase/migrations/.
import { iniciarBD } from "./ayuda_bd.js";

export async function crearClientePglite(){
  const bd = await iniciarBD();
  const { db, como } = bd;
  let sesion = null;                      // { user: { id } }
  const archivos = new Map();             // ruta -> Blob subido
  const rutasSubidas = [];

  const ejecutar = (texto, params) => como(sesion && sesion.user.id, () => db.query(texto, params));
  const nombreArg = (k) => `"${k}"`;

  // Constructor de consultas mínimo: select / insert / update / upsert / delete + filtros comunes.
  function tabla(nombre){
    const q = { op: "select", filtros: [], orden: [], limite: null, rango: null, valores: null, modo: "lista", devuelve: false };
    const b = {
      select(){ if(q.op !== "select") q.devuelve = true; return b; },
      insert(v){ q.op = "insert"; q.valores = v; return b; },
      update(v){ q.op = "update"; q.valores = v; return b; },
      upsert(v){ q.op = "upsert"; q.valores = v; return b; },
      delete(){ q.op = "delete"; return b; },
      eq(c, v){ q.filtros.push([c, "=", v]); return b; },
      order(c, o = {}){ q.orden.push(`${nombreArg(c)} ${o.ascending === false ? "desc" : "asc"}`); return b; },
      limit(n){ q.limite = n; return b; },
      range(d, h){ q.rango = [d, h]; return b; },
      maybeSingle(){ q.modo = "uno"; return b; },
      single(){ q.modo = "uno"; return b; },
      then(ok, mal){ return correr().then(ok, mal); },
    };
    async function correr(){
      try {
        const params = [];
        const filtrar = () => q.filtros.map(([c, o, v]) => { params.push(v); return `${nombreArg(c)} ${o} $${params.length}`; });
        const clausula = () => { const d = filtrar(); return d.length ? " where " + d.join(" and ") : ""; };
        let sql;
        if(q.op === "select"){
          sql = `select * from ${nombre}${clausula()}`;
          if(q.orden.length) sql += " order by " + q.orden.join(", ");
          if(q.rango) sql += ` limit ${q.rango[1] - q.rango[0] + 1} offset ${q.rango[0]}`;
          else if(q.limite) sql += ` limit ${q.limite}`;
        } else if(q.op === "insert" || q.op === "upsert"){
          const cols = Object.keys(q.valores);
          const vals = cols.map(c => { params.push(typeof q.valores[c] === "object" && q.valores[c] !== null ? JSON.stringify(q.valores[c]) : q.valores[c]); return `$${params.length}`; });
          sql = `insert into ${nombre} (${cols.map(nombreArg).join(",")}) values (${vals.join(",")})`;
          if(q.op === "upsert"){
            const pk = { areas: "nombre", tipos: "id", configuracion: "clave" }[nombre];
            sql += ` on conflict (${pk}) do update set ` + cols.filter(c => c !== pk).map(c => `${nombreArg(c)} = excluded.${nombreArg(c)}`).join(", ");
          }
          sql += " returning *";
        } else if(q.op === "update"){
          const sets = Object.keys(q.valores).map(c => { params.push(q.valores[c]); return `${nombreArg(c)} = $${params.length}`; });
          const donde2 = q.filtros.map(([c, o, v]) => { params.push(v); return `${nombreArg(c)} ${o} $${params.length}`; });
          sql = `update ${nombre} set ${sets.join(", ")} where ${donde2.join(" and ")} returning *`;
        } else {
          sql = `delete from ${nombre}${clausula()}`;
        }
        const r = await ejecutar(sql, params);
        const filas = r.rows;
        if(q.modo === "uno") return { data: filas[0] || null, error: null };
        return { data: filas, error: null };
      } catch(e){ return { data: null, error: { message: e.message, hint: e.hint } }; }
    }
    return b;
  }

  const cliente = {
    from: tabla,
    async rpc(nombre, args = {}){
      try {
        const claves = Object.keys(args);
        const params = claves.map(k => (typeof args[k] === "object" && args[k] !== null ? JSON.stringify(args[k]) : args[k]));
        const lista = claves.map((k, i) => `${k} => $${i + 1}`).join(", ");
        const r = await ejecutar(`select * from ${nombre}(${lista})`, params);
        const fila = r.rows[0];
        if(!fila) return { data: null, error: null };
        const ks = Object.keys(fila);
        return { data: ks.length === 1 && ks[0] === nombre ? fila[nombre] : fila, error: null };
      } catch(e){ return { data: null, error: { message: e.message, hint: e.hint } }; }
    },
    auth: {
      async getSession(){ return { data: { session: sesion } }; },
      async signInWithPassword({ email }){
        const r = await db.query("select id from auth.users where email = $1", [email]);
        if(!r.rows[0]) return { data: null, error: { message: "Invalid login credentials" } };
        sesion = { user: { id: r.rows[0].id } };
        return { data: { user: sesion.user, session: sesion }, error: null };
      },
      async signOut(){ sesion = null; return { error: null }; },
      async updateUser(){ return { error: null }; },
      async resetPasswordForEmail(){ return { error: null }; },
      onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; },
    },
    storage: { from: () => ({
      async upload(ruta, blob){
        // Imita la política de Storage: la subida pasa por los permisos de la tabla de objetos.
        try {
          await ejecutar("insert into storage.objects (bucket_id, name) values ('archivos', $1)", [ruta]);
        } catch(e){ return { data: null, error: { message: e.message } }; }
        archivos.set(ruta, blob); rutasSubidas.push(ruta);
        return { data: { path: ruta }, error: null };
      },
      async createSignedUrl(ruta){ return { data: { signedUrl: "https://ejemplo.test/firmada/" + ruta }, error: null }; },
    }) },
    functions: { async invoke(){ return { data: null, error: new Error("sin función") }; } },
    channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; },
    removeChannel(){},
  };
  return { cliente, ...bd, archivos, rutasSubidas };
}
