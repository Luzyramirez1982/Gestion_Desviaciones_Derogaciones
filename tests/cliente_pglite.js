// Cliente "simulado" con la forma de @neondatabase/neon-js, pero que habla con el PostgreSQL de prueba (PGlite).
// Sirve para probar el adaptador de la aplicación contra las funciones reales de db/migraciones/.
// Lo que hace Neon fuera de la base de datos (cuentas de ingreso y contraseñas) se imita aquí en memoria.
import { iniciarBD } from "./ayuda_bd.js";

export async function crearClientePglite(){
  const bd = await iniciarBD();
  const { db, como } = bd;
  let sesion = null;                      // { user: { id } }
  const cuentas = new Map();              // correo -> { id, clave, nombre, bloqueada }
  const llamadas = [];                    // lo que se le pidió al servicio de ingreso, para revisarlo en las pruebas

  // Las personas de la base de prueba entran con la contraseña "x".
  for(const p of (await db.query("select id, correo, nombre from perfiles")).rows){
    cuentas.set(p.correo, { id: p.id, clave: "x", nombre: p.nombre, bloqueada: false });
  }

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

  const sinError = { error: null };
  const falla = (message) => ({ data: null, error: { message } });
  const cuentaPorId = (id) => [...cuentas.values()].find(c => c.id === id);

  const auth = {
    async getSession(){ return { data: sesion ? { session: sesion, user: sesion.user } : { session: null, user: null } }; },
    signIn: {
      async email({ email, password }){
        const c = cuentas.get(email);
        if(!c || c.clave !== password || c.bloqueada) return falla("Invalid email or password");
        sesion = { user: { id: c.id, email } };
        return { data: { user: sesion.user, session: sesion }, error: null };
      },
    },
    async signOut(){ sesion = null; return sinError; },
    async token(){ return sesion ? { data: { token: "t-" + sesion.user.id }, error: null } : { data: null, error: { message: "not authenticated" } }; },
    async changePassword({ newPassword, currentPassword }){
      const c = sesion && cuentaPorId(sesion.user.id);
      if(!c) return falla("not authenticated");
      if(c.clave !== currentPassword) return falla("Invalid password");
      c.clave = newPassword;
      return { data: {}, error: null };
    },
    async requestPasswordReset({ email }){ llamadas.push(["recuperar", email]); return sinError; },
    admin: {
      async createUser({ email, password, name }){
        if(cuentas.has(email)) return falla("User already exists");
        const id = "cuenta-" + (cuentas.size + 1);
        cuentas.set(email, { id, clave: password, nombre: name, bloqueada: false });
        llamadas.push(["crear", email]);
        return { data: { user: { id, email, name } }, error: null };
      },
      async setUserPassword({ userId, newPassword }){
        const c = cuentaPorId(userId);
        if(!c) return falla("User not found");
        c.clave = newPassword; llamadas.push(["clave", userId]);
        return { data: {}, error: null };
      },
      async removeUser({ userId }){
        for(const [correo, c] of cuentas) if(c.id === userId) cuentas.delete(correo);
        llamadas.push(["quitar", userId]);
        return { data: {}, error: null };
      },
      async banUser({ userId }){ const c = cuentaPorId(userId); if(c) c.bloqueada = true; llamadas.push(["bloquear", userId]); return { data: {}, error: null }; },
      async unbanUser({ userId }){ const c = cuentaPorId(userId); if(c) c.bloqueada = false; llamadas.push(["liberar", userId]); return { data: {}, error: null }; },
    },
  };

  // Llama a una función de la base como si fuera esa persona (lo que hace la Data API con el token que recibe).
  async function llamarRpc(uid, nombre, args = {}){
    try {
      const claves = Object.keys(args);
      const params = claves.map(k => (typeof args[k] === "object" && args[k] !== null ? JSON.stringify(args[k]) : args[k]));
      const lista = claves.map((k, i) => `${k} => $${i + 1}`).join(", ");
      const r = await como(uid, () => db.query(`select * from ${nombre}(${lista})`, params));
      const fila = r.rows[0];
      if(!fila) return { data: null, error: null };
      const ks = Object.keys(fila);
      return { data: ks.length === 1 && ks[0] === nombre ? fila[nombre] : fila, error: null };
    } catch(e){ return { data: null, error: { message: e.message, hint: e.hint } }; }
  }

  const cliente = {
    from: tabla,
    rpc: (nombre, args) => llamarRpc(sesion && sesion.user.id, nombre, args),
    auth,
  };
  return { cliente, ...bd, cuentas, llamadas, llamarRpc };
}
