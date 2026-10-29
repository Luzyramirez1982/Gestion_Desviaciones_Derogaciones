// Clasificación de peligros según la GTC 45 (Anexo A), para solicitudes de Seguridad y Salud en el Trabajo.
// Falta que SST valide esta lista (ver PLAN.md).
export const GTC45_DESCRIPCION = {
  "Biológico": ["Virus","Bacterias","Hongos","Ricketsias","Parásitos","Picaduras","Mordeduras","Fluidos o excrementos"],
  "Físico": [
    "Ruido (de impacto, intermitente, continuo)",
    "Iluminación (luz visible por exceso o deficiencia)",
    "Vibración (cuerpo entero, segmentaria)",
    "Temperaturas extremas (calor y frío)",
    "Presión atmosférica (normal y ajustada)",
    "Radiaciones ionizantes (rayos X, gama, beta y alfa)",
    "Radiaciones no ionizantes (láser, ultravioleta, infrarroja, radiofrecuencia, microondas)",
  ],
  "Químico": [
    "Polvos orgánicos e inorgánicos",
    "Fibras",
    "Líquidos (nieblas y rocíos)",
    "Gases y vapores",
    "Humos metálicos y no metálicos",
    "Material particulado",
  ],
  "Psicosocial": [
    "Gestión organizacional (estilo de mando, pago, contratación, participación, inducción y capacitación, bienestar social, evaluación del desempeño, manejo de cambios)",
    "Características de la organización del trabajo (comunicación, tecnología, organización del trabajo, demandas cualitativas y cuantitativas de la labor)",
    "Características del grupo social de trabajo (relaciones, cohesión, calidad de interacciones, trabajo en equipo)",
    "Condiciones de la tarea (carga mental, contenido de la tarea, demandas emocionales, sistemas de control, definición de roles, monotonía)",
    "Interfase persona–tarea (conocimientos, habilidades, iniciativa, autonomía y reconocimiento, identificación con la tarea y la organización)",
    "Jornada de trabajo (pausas, trabajo nocturno, rotación, horas extras, descansos)",
  ],
  "Biomecánico (ergonómico)": [
    "Postura (prolongada, mantenida, forzada, antigravitacional)",
    "Esfuerzo",
    "Movimiento repetitivo",
    "Manipulación manual de cargas",
  ],
  "Condiciones de seguridad": [
    "Mecánico (elementos o partes de máquinas, herramientas, equipos, piezas a trabajar, materiales proyectados sólidos o fluidos)",
    "Eléctrico (alta y baja tensión, estática)",
    "Locativo (sistemas y medios de almacenamiento, superficies de trabajo irregulares, deslizantes o con diferencia de nivel, orden y aseo, caída de objetos)",
    "Tecnológico (explosión, fuga, derrame, incendio)",
    "Accidentes de tránsito",
    "Públicos (robos, atracos, asaltos, atentados, de orden público)",
    "Trabajo en alturas",
    "Espacios confinados",
  ],
  "Fenómenos naturales": ["Sismo","Terremoto","Vendaval","Inundación","Derrumbe","Precipitaciones (lluvias, granizadas, heladas)"],
};
export const gtcOptions = (peligro) => GTC45_DESCRIPCION[peligro] || [];
export const gtcLabel = (peligro) => peligro === "Condiciones de seguridad" ? "Condición de seguridad específica (GTC 45)" : "Clasificación específica del peligro " + (peligro ? peligro.toLowerCase() + " " : "") + "(GTC 45)";;

export const SST_PELIGROS = [
  {nombre:"Biológico",desc:"Virus, bacterias, hongos, parásitos, picaduras o mordeduras."},
  {nombre:"Físico",desc:"Ruido, iluminación, vibración, temperaturas extremas, radiaciones."},
  {nombre:"Químico",desc:"Polvos, líquidos, gases, vapores o material particulado."},
  {nombre:"Psicosocial",desc:"Gestión organizacional, carga mental, jornada de trabajo."},
  {nombre:"Biomecánico (ergonómico)",desc:"Posturas, esfuerzos, movimientos repetitivos, manejo de cargas."},
  {nombre:"Condiciones de seguridad",desc:"Mecánico, eléctrico, locativo, tecnológico, trabajo en alturas, espacios confinados, seguridad vial."},
  {nombre:"Fenómenos naturales",desc:"Sismos, vendavales, inundaciones, derrumbes."},
];

