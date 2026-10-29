// Conexión a la base de Neon para los scripts de administración (no se usa en la aplicación del navegador).
// La dirección con contraseña va en la variable DATABASE_URL (en un archivo .env propio o escrita en la consola);
// nunca se escribe en el repositorio. Se saca de Neon > Connect > "Connection string".
import pg from "pg";

export async function conectar(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error("Falta DATABASE_URL: la dirección de conexión de Neon (empieza con postgresql://).");
    console.error("Cópiela desde Neon > Connect > Connection string y ejecute, por ejemplo en PowerShell:");
    console.error('  $env:DATABASE_URL = "postgresql://..." ; node scripts/<nombre>.mjs');
    process.exit(1);
  }
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  return cliente;
}