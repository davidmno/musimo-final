import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { closeDb, getDb, idString } from "./config/db.js";
import { searchCatalog } from "./services/catalog.services.js";
import { releaseKey } from "./utils/text.js";

const SEED_TAG = "musimo-demo-rich-v1";
const DEMO_PASSWORD = "musimo123";
const RESET_ONLY = process.argv.includes("--reset");

const demoUsers = [
  {
    nombre: "Lucía Benítez",
    handle: "lucia.sonora",
    email: "lucia.sonora@demo.musimo.app",
    bio: "Escucho pop y R&B como quien arma un archivo emocional. Siempre vuelvo a las voces, los detalles de producción y los discos que cambian con la noche.",
    avatarImage: "https://i.pravatar.cc/320?img=47",
    artists: ["Victoria Monét", "Tinashe", "FLO", "Ariana Grande", "Olivia Dean"],
    top5: [["Victoria Monét", "JAGUAR II"], ["Tinashe", "333"], ["FLO", "Access All Areas"], ["Ariana Grande", "Sweetener"], ["Olivia Dean", "Messy"]],
  },
  {
    nombre: "Tomás Vidal",
    handle: "tomas.en.loop",
    email: "tomas.en.loop@demo.musimo.app",
    bio: "Psicodelia, bajos elásticos y discos para caminar sin apuro. Me interesan las canciones que construyen un espacio entero alrededor de una idea.",
    avatarImage: "https://i.pravatar.cc/320?img=12",
    artists: ["Tame Impala", "Jungle", "Tennis", "Björk", "Robyn"],
    top5: [["Tame Impala", "Currents"], ["Jungle", "Volcano"], ["Tennis", "Swimmer"], ["Björk", "Homogenic"], ["Robyn", "Honey"]],
  },
  {
    nombre: "Valentina Ríos",
    handle: "vale.popnotes",
    email: "vale.popnotes@demo.musimo.app",
    bio: "Pop de precisión, estribillos enormes y pequeñas decisiones que convierten una canción en recuerdo. Colecciono discos que hacen más liviano el día.",
    avatarImage: "https://i.pravatar.cc/320?img=44",
    artists: ["Kylie Minogue", "Robyn", "Agnes", "Zara Larsson", "Sabrina Carpenter"],
    top5: [["Robyn", "Body Talk"], ["Kylie Minogue", "Fever"], ["Agnes", "Magic Still Exists"], ["Zara Larsson", "Venus"], ["Sabrina Carpenter", "Short n' Sweet"]],
  },
  {
    nombre: "Martina Sosa",
    handle: "marti.entrelineas",
    email: "marti.entrelineas@demo.musimo.app",
    bio: "Canciones íntimas, letras que parecen conversaciones y discos para escuchar cerca. Escribo para entender por qué una melodía puede quedarse tantos años.",
    avatarImage: "https://i.pravatar.cc/320?img=32",
    artists: ["Laufey", "Olivia Dean", "BENEE", "Ariana Grande", "Tennis"],
    top5: [["Laufey", "Bewitched"], ["Olivia Dean", "Messy"], ["BENEE", "Hey u x"], ["Tennis", "Yours Conditionally"], ["Ariana Grande", "Eternal Sunshine"]],
  },
  {
    nombre: "Julián Ferrer",
    handle: "julian.afterhours",
    email: "julian.afterhours@demo.musimo.app",
    bio: "Música para después de medianoche: grooves, sintetizadores y voces que aparecen como luces lejanas. Mis listas suelen empezar bailables y terminar introspectivas.",
    avatarImage: "https://i.pravatar.cc/320?img=68",
    artists: ["Jungle", "Tame Impala", "Tinashe", "Robyn", "Victoria Monét"],
    top5: [["Jungle", "Loving in Stereo"], ["Tame Impala", "The Slow Rush"], ["Tinashe", "BB/ANG3L"], ["Robyn", "Honey"], ["Victoria Monét", "JAGUAR"]],
  },
  {
    nombre: "Camila Ortiz",
    handle: "cami.lado.b",
    email: "cami.lado.b@demo.musimo.app",
    bio: "Crecí entre CDs grabados, videoclips y coreografías improvisadas. Me gusta volver al pop de otras épocas sin tratarlo como una pieza de museo.",
    avatarImage: "https://i.pravatar.cc/320?img=25",
    artists: ["Madonna", "Melanie C", "Kylie Minogue", "Agnes", "Robyn"],
    top5: [["Melanie C", "Northern Star"], ["Madonna", "Confessions on a Dance Floor"], ["Kylie Minogue", "Fever"], ["Agnes", "Dance Love Pop"], ["Robyn", "Body Talk"]],
  },
  {
    nombre: "Bruno Acosta",
    handle: "bruno.sintesis",
    email: "bruno.sintesis@demo.musimo.app",
    bio: "Producción, texturas y canciones que suenan como objetos extraños. Me interesan los discos que primero desconciertan y después se vuelven una casa.",
    avatarImage: "https://i.pravatar.cc/320?img=11",
    artists: ["Björk", "Robyn", "Tame Impala", "Jungle", "Tinashe"],
    top5: [["Björk", "Homogenic"], ["Björk", "Vespertine"], ["Tame Impala", "Currents"], ["Robyn", "Honey"], ["Jungle", "Volcano"]],
  },
  {
    nombre: "Emilia Paz",
    handle: "emi.cassettes",
    email: "emi.cassettes@demo.musimo.app",
    bio: "Pop actual, diarios personales y canciones que parecen mensajes de voz mejor producidos. Siempre tengo una lista distinta para viajar en colectivo.",
    avatarImage: "https://i.pravatar.cc/320?img=49",
    artists: ["Ariana Grande", "Sabrina Carpenter", "Olivia Dean", "Zara Larsson", "BENEE"],
    top5: [["Ariana Grande", "Eternal Sunshine"], ["Sabrina Carpenter", "Short n' Sweet"], ["Olivia Dean", "Messy"], ["Zara Larsson", "Poster Girl"], ["BENEE", "Hey u x"]],
  },
  {
    nombre: "Renata Quiroga",
    handle: "rena.hifi",
    email: "rena.hifi@demo.musimo.app",
    bio: "R&B, armonías vocales y discos que muestran cuánto puede contar un arreglo. Comento mucho porque escuchar otras lecturas cambia mi propia experiencia.",
    avatarImage: "https://i.pravatar.cc/320?img=57",
    artists: ["FLO", "Victoria Monét", "Tinashe", "Olivia Dean", "Ariana Grande"],
    top5: [["Victoria Monét", "JAGUAR"], ["Tinashe", "Quantum Baby"], ["FLO", "Access All Areas"], ["Olivia Dean", "Messy"], ["Ariana Grande", "Sweetener"]],
  },
  {
    nombre: "Mateo Silva",
    handle: "mateo.radar",
    email: "mateo.radar@demo.musimo.app",
    bio: "Busco canciones nuevas pero termino queriendo a los discos completos. Indie pop, guitarras suaves y ritmos que funcionan mejor con auriculares.",
    avatarImage: "https://i.pravatar.cc/320?img=15",
    artists: ["BENEE", "Tennis", "Jungle", "Tame Impala", "Laufey"],
    top5: [["BENEE", "Hey u x"], ["Tennis", "Yours Conditionally"], ["Jungle", "Volcano"], ["Tame Impala", "Currents"], ["Laufey", "Bewitched"]],
  },
  {
    nombre: "Paula Ibarra",
    handle: "paula.rebobina",
    email: "paula.rebobina@demo.musimo.app",
    bio: "Pop escandinavo, brillo y melancolía en la misma pista. Escribo sobre la música que convierte una habitación común en una pequeña pista de baile.",
    avatarImage: "https://i.pravatar.cc/320?img=36",
    artists: ["Agnes", "Robyn", "Kylie Minogue", "Zara Larsson", "Madonna"],
    top5: [["Agnes", "Magic Still Exists"], ["Robyn", "Body Talk"], ["Kylie Minogue", "Disco"], ["Zara Larsson", "Venus"], ["Madonna", "Confessions on a Dance Floor"]],
  },
  {
    nombre: "Nicolás Suárez",
    handle: "nico.enestereo",
    email: "nico.enestereo@demo.musimo.app",
    bio: "Discos detallistas, voces cercanas y momentos en los que el silencio también forma parte del arreglo. Escucho lento y vuelvo mucho.",
    avatarImage: "https://i.pravatar.cc/320?img=69",
    artists: ["Björk", "Laufey", "Tame Impala", "Tennis", "Olivia Dean"],
    top5: [["Björk", "Vespertine"], ["Laufey", "Everything I Know About Love"], ["Tame Impala", "Currents"], ["Tennis", "Swimmer"], ["Olivia Dean", "Messy"]],
  },
];

const davidArtistNames = [
  "Ariana Grande",
  "Tame Impala",
  "BENEE",
  "Victoria Monét",
  "Sabrina Carpenter",
  "Laufey",
  "Melanie C",
  "Björk",
  "Tinashe",
  "FLO",
  "Jungle",
  "Olivia Dean",
  "Zara Larsson",
  "Robyn",
  "Agnes",
  "Tennis",
];

const reviewSpecs = [
  ["lucia.sonora", "Victoria Monét", "JAGUAR II", "Es un disco que entiende el lujo como precisión: cada arreglo entra cuando tiene que entrar y deja espacio para que la voz mande. Volví varias veces por la producción y terminé quedándome por la seguridad con la que cuenta su propia historia.", 5, ["Descubrimiento", "Confianza"], "Lo escuché completo una noche de verano, con la ventana abierta y la ciudad casi en silencio."],
  ["lucia.sonora", "Tinashe", "BB/ANG3L", "Me gusta cómo consigue que algo tan breve se sienta como un mundo cerrado. No hay relleno: cambia de textura, de temperatura y de actitud sin perder el hilo.", 4, ["Noche", "Detalle"], "Auriculares, luces apagadas y la sensación de estar escuchando algo secreto."],
  ["lucia.sonora", "FLO", "Access All Areas", "Las armonías son el centro, pero lo que más me atrapa es la personalidad distinta que aparece en cada canción. Suena clásico sin quedarse viviendo en el pasado.", 5, ["Euforia", "Amistad"], "Lo compartí con dos amigas y terminamos eligiendo una favorita distinta cada una."],

  ["tomas.en.loop", "Tame Impala", "Currents", "Lo conocía de memoria, pero esta vez escuché las transiciones como si fueran una sola canción larguísima. Es un disco sobre cambiar que también cambia la habitación donde suena.", 5, ["Cambio", "Viaje"], "Un viaje largo en colectivo, mirando cómo la ciudad se volvía ruta."],
  ["tomas.en.loop", "Jungle", "Volcano", "Tiene movimiento incluso cuando baja la intensidad. Los bajos y las voces hacen que todo parezca coreografiado, pero nunca rígido.", 4, ["Movimiento", "Energía"], "Lo puse para ordenar la casa y terminé bailando entre cajas."],
  ["tomas.en.loop", "Tennis", "Swimmer", "Suena pequeño, cercano y elegante. Hay melodías que parecen haber estado siempre ahí, esperando que alguien las encontrara.", 4, ["Calma", "Hogar"], "Domingo de lluvia, café frío y ningún apuro por cambiar de disco."],

  ["vale.popnotes", "Robyn", "Body Talk", "Puede ser eufórico y devastador en el mismo minuto. Ese equilibrio es lo que hace que vuelva: bailar no borra la tristeza, apenas le da otra forma.", 5, ["Euforia", "Melancolía"], "Lo escuché caminando de noche después de despedirme de alguien importante."],
  ["vale.popnotes", "Agnes", "Magic Still Exists", "Tiene la convicción de un gran disco pop sin pedir disculpas. Cada estribillo parece construido para abrir las ventanas.", 5, ["Libertad", "Renacer"], "Primer día cálido después de un invierno demasiado largo."],
  ["vale.popnotes", "Zara Larsson", "Venus", "Me gusta cuando el pop suena directo pero no automático. Hay canciones acá que parecen simples hasta que empezás a notar todas las capas.", 4, ["Energía", "Descubrimiento"], "Lo puse mientras me preparaba para salir y terminó acompañando toda la noche."],

  ["marti.entrelineas", "Laufey", "Bewitched", "Las canciones se sienten como cartas que nunca fueron enviadas. Todo está cuidado, pero nunca tanto como para esconder la vulnerabilidad.", 5, ["Intimidad", "Nostalgia"], "Una madrugada en la que necesitaba escuchar una voz más tranquila que mis pensamientos."],
  ["marti.entrelineas", "Olivia Dean", "Messy", "Tiene calidez sin volverse decorativo. Me gusta que las dudas no aparecen como un problema a resolver, sino como parte de estar creciendo.", 5, ["Crecimiento", "Calma"], "Volviendo sola a casa después de una conversación que me dejó pensando."],
  ["marti.entrelineas", "BENEE", "Hey u x", "Parece liviano al principio, pero está lleno de pequeñas rarezas y cambios de humor. Es de esos discos que se vuelven más personales con cada escucha.", 4, ["Descubrimiento", "Juventud"], "Lo encontré por casualidad y durante una semana no escuché casi otra cosa."],

  ["julian.afterhours", "Jungle", "Loving in Stereo", "Todo empuja hacia adelante. Incluso las canciones más suaves tienen un pulso que hace imposible escucharlas como fondo.", 5, ["Movimiento", "Verano"], "Una tarde de limpieza que terminó pareciéndose a una fiesta privada."],
  ["julian.afterhours", "Tame Impala", "The Slow Rush", "El tiempo aparece como una textura más. No siempre necesito entender cada letra para sentir que el disco está hablando de algo que también me preocupa.", 4, ["Tiempo", "Cambio"], "Lo escuché el día que cerré una etapa que había durado muchos años."],
  ["julian.afterhours", "Tinashe", "333", "Es ambicioso sin perder intimidad. Cambia de forma muchas veces, pero la voz mantiene todo unido.", 5, ["Noche", "Libertad"], "Auriculares nuevos, caminata larga y la ciudad completamente distinta."],

  ["cami.lado.b", "Melanie C", "Northern Star", "Volver a este disco es recordar una época y también descubrir cuánto había en él que yo no entendía cuando era más chica.", 5, ["Nostalgia", "Identidad"], "Una caja de CDs viejos que apareció durante una mudanza."],
  ["cami.lado.b", "Madonna", "Confessions on a Dance Floor", "La continuidad no es sólo técnica: hace que el disco parezca una noche entera, desde el entusiasmo inicial hasta ese momento en que bailar se vuelve introspectivo.", 5, ["Noche", "Euforia"], "Lo escuchábamos mientras limpiábamos la casa y siempre terminábamos demorando el doble."],
  ["cami.lado.b", "Kylie Minogue", "Fever", "No envejeció como un recuerdo quieto. Sigue teniendo una claridad y una seguridad que hacen que cada canción parezca recién estrenada.", 5, ["Hogar", "Euforia"], "Un verano compartido con mi hermana, el disco en loop y las ventanas abiertas."],

  ["bruno.sintesis", "Björk", "Homogenic", "La producción no acompaña las emociones: las convierte en paisaje. Hay golpes, cuerdas y silencios que parecen tener una geografía propia.", 5, ["Impacto", "Paisaje"], "Lo escuché con auriculares durante una tormenta y el clima terminó formando parte del disco."],
  ["bruno.sintesis", "Robyn", "Honey", "No busca el impacto inmediato de Body Talk. Se mueve de otra manera, más líquida, y por eso terminó creciendo mucho más de lo que esperaba.", 4, ["Calma", "Cuerpo"], "Una noche sin planes que terminó siendo exactamente lo que necesitaba."],
  ["bruno.sintesis", "Tame Impala", "Currents", "Me interesa menos como colección de canciones que como diseño sonoro. Cada efecto parece exagerado y, al mismo tiempo, inevitable.", 5, ["Detalle", "Transformación"], "La primera escucha realmente atenta, años después de conocer los sencillos."],

  ["emi.cassettes", "Ariana Grande", "Eternal Sunshine", "Tiene momentos muy directos y otros que parecen recuerdos editados. Me gusta cómo la producción sostiene la vulnerabilidad sin volverla frágil.", 4, ["Duelo", "Claridad"], "Una mañana en la que decidí dejar de releer una conversación vieja."],
  ["emi.cassettes", "Sabrina Carpenter", "Short n' Sweet", "Es ingenioso sin sentirse escrito para demostrarlo. Las mejores canciones encuentran una frase simple y la vuelven imposible de olvidar.", 5, ["Humor", "Euforia"], "Viaje en colectivo con una amiga, compartiendo un solo auricular."],
  ["emi.cassettes", "Zara Larsson", "Poster Girl", "Tiene esa energía de pop que mejora una rutina cotidiana. No todas las canciones me llegan igual, pero las que funcionan se quedan todo el día.", 4, ["Energía", "Rutina"], "Preparándome para salir después de una semana agotadora."],

  ["rena.hifi", "Victoria Monét", "JAGUAR", "Es compacto y sensual, pero también está lleno de decisiones musicales que invitan a volver. Cada escucha revela una armonía nueva.", 5, ["Detalle", "Confianza"], "Lo descubrí tarde y sentí que había llegado justo cuando lo necesitaba."],
  ["rena.hifi", "Tinashe", "Quantum Baby", "No intenta explicarlo todo. Las canciones aparecen, dejan una textura o una frase y se van antes de volverse previsibles.", 4, ["Noche", "Misterio"], "Caminando sola después de un recital, todavía con los oídos zumbando."],
  ["rena.hifi", "FLO", "Access All Areas", "Las tres voces tienen identidad propia y aun así suenan como una unidad. Ese equilibrio hace que el disco se sienta vivo.", 5, ["Amistad", "Euforia"], "Lo escuchamos juntas antes de salir y discutimos cuál era el mejor puente."],

  ["mateo.radar", "BENEE", "Hey u x", "Tiene una forma muy natural de mezclar rareza y melodía. Nunca parece esforzarse por ser alternativo: simplemente sigue sus propias reglas.", 4, ["Descubrimiento", "Juego"], "Una recomendación que abrí sin expectativas durante una tarde de trabajo."],
  ["mateo.radar", "Tennis", "Yours Conditionally", "Me gusta la sensación de distancia: suena cálido, pero como una postal encontrada años después.", 5, ["Viaje", "Nostalgia"], "Ruta, sol bajo y el paisaje repitiéndose durante horas."],
  ["mateo.radar", "Jungle", "Volcano", "Es difícil separar las canciones de la idea de movimiento. Todo parece diseñado para que el cuerpo entienda antes que la cabeza.", 4, ["Movimiento", "Energía"], "La primera vez que volví caminando del trabajo sin mirar el teléfono."],

  ["paula.rebobina", "Agnes", "Dance Love Pop", "Tiene la ingenuidad brillante de una época del pop y, al mismo tiempo, canciones que siguen funcionando sin necesidad de nostalgia.", 4, ["Euforia", "Recuerdo"], "Una playlist vieja que encontré y me devolvió a una habitación que ya no existe."],
  ["paula.rebobina", "Robyn", "Body Talk", "Es un disco que me enseñó que una canción triste no tiene por qué quedarse quieta. Todavía encuentro algo nuevo en esa contradicción.", 5, ["Melancolía", "Libertad"], "Bailando sola después de una semana especialmente difícil."],
  ["paula.rebobina", "Kylie Minogue", "Disco", "No intenta fingir que el tiempo no pasó; lo convierte en celebración. Tiene una calidez que se agradece mucho cuando todo alrededor parece incierto.", 5, ["Hogar", "Celebración"], "Una videollamada larga, música de fondo y ganas de volver a encontrarnos."],

  ["nico.enestereo", "Björk", "Vespertine", "Es un disco de sonidos pequeños que termina ocupándolo todo. Hay detalles que sólo aparecen cuando uno baja el volumen y se acerca.", 5, ["Intimidad", "Invierno"], "La primera noche fría del año, escuchándolo casi a oscuras."],
  ["nico.enestereo", "Laufey", "Everything I Know About Love", "Las canciones toman emociones conocidas y las dicen con una claridad que nunca se siente obvia.", 4, ["Amor", "Crecimiento"], "Volviendo a casa después de una primera cita que no sabía cómo interpretar."],
  ["nico.enestereo", "Tame Impala", "Currents", "Cada vez que vuelvo cambia el centro del disco: a veces es el ritmo, otras la voz, otras la sensación de estar dejando algo atrás.", 5, ["Cambio", "Memoria"], "Ordenando fotos viejas y entendiendo que ya no extrañaba lo mismo."],
];

const listSpecs = [
  ["lucia.sonora", "R&B de precisión", "Voces, armonías y producciones donde cada detalle tiene una intención.", "public", [["Victoria Monét", "JAGUAR II"], ["Tinashe", "333"], ["FLO", "Access All Areas"], ["Ariana Grande", "Sweetener"], ["Olivia Dean", "Messy"]]],
  ["lucia.sonora", "La noche se vuelve más lenta", "Discos que funcionan mejor cuando baja el ruido de alrededor.", "public", [["Tinashe", "BB/ANG3L"], ["Robyn", "Honey"], ["Björk", "Vespertine"], ["Tame Impala", "Currents"]]],
  ["tomas.en.loop", "Bajos que ordenan el día", "Una lista para moverse, trabajar y volver a empezar.", "public", [["Jungle", "Volcano"], ["Tame Impala", "Currents"], ["Robyn", "Body Talk"], ["Tinashe", "333"]]],
  ["tomas.en.loop", "Psicodelia doméstica", "Discos enormes para escuchar en espacios pequeños.", "private", [["Tame Impala", "The Slow Rush"], ["Björk", "Homogenic"], ["Tennis", "Swimmer"]]],
  ["vale.popnotes", "Pop nórdico para sobrevivir", "Melancolía, sintetizadores y estribillos que levantan cualquier tarde.", "public", [["Robyn", "Body Talk"], ["Agnes", "Magic Still Exists"], ["Zara Larsson", "Venus"], ["Kylie Minogue", "Disco"]]],
  ["marti.entrelineas", "Domingo cerca de la ventana", "Canciones cálidas para bajar el ritmo sin apagar el día.", "public", [["Laufey", "Bewitched"], ["Olivia Dean", "Messy"], ["Tennis", "Yours Conditionally"], ["BENEE", "Hey u x"]]],
  ["julian.afterhours", "Después de medianoche", "Empieza en movimiento y termina mirando el techo.", "public", [["Jungle", "Loving in Stereo"], ["Tinashe", "BB/ANG3L"], ["Robyn", "Honey"], ["Tame Impala", "The Slow Rush"]]],
  ["cami.lado.b", "CDs que todavía sé de memoria", "Pop de otras épocas que nunca quedó guardado del todo.", "public", [["Melanie C", "Northern Star"], ["Madonna", "Confessions on a Dance Floor"], ["Kylie Minogue", "Fever"], ["Agnes", "Dance Love Pop"]]],
  ["bruno.sintesis", "Texturas antes que palabras", "Discos donde la producción también cuenta la historia.", "public", [["Björk", "Homogenic"], ["Björk", "Vespertine"], ["Tame Impala", "Currents"], ["Robyn", "Honey"]]],
  ["emi.cassettes", "Pop para viajar en colectivo", "Canciones directas para mirar la ciudad pasar.", "public", [["Ariana Grande", "Eternal Sunshine"], ["Sabrina Carpenter", "Short n' Sweet"], ["Zara Larsson", "Poster Girl"], ["BENEE", "Hey u x"]]],
  ["rena.hifi", "Armonías que cambian todo", "Voces que se responden, se superponen y construyen otra emoción.", "public", [["FLO", "Access All Areas"], ["Victoria Monét", "JAGUAR"], ["Tinashe", "Quantum Baby"], ["Olivia Dean", "Messy"]]],
  ["mateo.radar", "Indie pop sin apuro", "Guitarras suaves, melodías raras y discos para escuchar completos.", "public", [["Tennis", "Swimmer"], ["BENEE", "Hey u x"], ["Tame Impala", "Currents"], ["Laufey", "Bewitched"]]],
  ["paula.rebobina", "Bailar también es recordar", "Pop brillante para transformar nostalgia en movimiento.", "public", [["Agnes", "Magic Still Exists"], ["Robyn", "Body Talk"], ["Kylie Minogue", "Disco"], ["Madonna", "Confessions on a Dance Floor"]]],
  ["nico.enestereo", "Escuchar de cerca", "Discos que piden silencio, tiempo y una segunda vuelta.", "public", [["Björk", "Vespertine"], ["Laufey", "Everything I Know About Love"], ["Tennis", "Yours Conditionally"], ["Olivia Dean", "Messy"]]],
];

const commentTexts = [
  "Me pasó algo parecido, pero recién en la segunda escucha pude ponerlo en palabras.",
  "Nunca había pensado el disco desde ese lugar. Voy a volver con esta idea en mente.",
  "Ese momento que contás cambia por completo cómo se lee la reseña.",
  "Coincido especialmente con lo de la producción: está llena de detalles que aparecen tarde.",
  "Esta fue la canción que hizo que yo también entrara al álbum completo.",
  "Lo escuché en otro contexto y me produjo casi lo contrario. Me encanta que pueda abrir lecturas tan distintas.",
  "La descripción del clima me llevó directo a mi primera escucha.",
  "Me guardo esta reseña para volver después de escucharlo con auriculares.",
  "Hay una mezcla de euforia y melancolía que también es lo que más me queda.",
  "Qué buena forma de contar algo personal sin perder de vista el disco.",
];

const listCommentTexts = [
  "La secuencia funciona muy bien; no esperaba ese paso entre el segundo y el tercer disco.",
  "Guardada. Hay dos que no conozco y encajan perfecto con el resto.",
  "Esta lista necesita una escucha completa un domingo sin apuro.",
  "Me gusta que no esté ordenada por popularidad, sino por clima.",
  "Sumaría otro álbum, pero entiendo por qué cerraste con ese.",
  "El título describe exactamente la sensación que deja la selección.",
];

function normalized(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dateAgo(days, hours = 0, minutes = 0) {
  const date = new Date();
  date.setMilliseconds(0);
  date.setSeconds(0);
  date.setDate(date.getDate() - days);
  date.setHours(Math.max(0, 20 - hours), minutes, 0, 0);
  return date;
}

function fallbackRelease(artist, album, year = null) {
  const seed = normalized(`${artist}-${album}`).replaceAll(" ", "-");
  return {
    id: null,
    catalogId: null,
    album,
    title: album,
    artist,
    artistId: null,
    image: `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/600`,
    year,
    releaseDate: year ? `${year}-01-01` : null,
    releaseType: "Álbum",
  };
}

function uniquePairs(values = []) {
  const seen = new Set();
  return values.filter(([artist, album]) => {
    const key = `${normalized(artist)}|${normalized(album)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function cleanPreviousSeed(db) {
  const collections = [
    "notifications",
    "resonances",
    "comments",
    "to_review",
    "artist_follows",
    "follows",
    "reviews",
    "lists",
  ];

  for (const name of collections) {
    await db.collection(name).deleteMany({ seedTag: SEED_TAG });
  }

  const demoEmails = demoUsers.map((user) => user.email);
  await db.collection("usuarios").deleteMany({
    $or: [
      { seedTag: SEED_TAG },
      { email: { $in: demoEmails } },
    ],
  });
}

async function resolveCatalog() {
  const artistNames = [...new Set([
    ...davidArtistNames,
    "Kylie Minogue",
    "Madonna",
    ...demoUsers.flatMap((user) => user.artists),
    ...reviewSpecs.map(([, artist]) => artist),
    ...listSpecs.flatMap(([, , , , albums]) => albums.map(([artist]) => artist)),
  ])];

  const requestedPairs = uniquePairs([
    ...demoUsers.flatMap((user) => user.top5),
    ...reviewSpecs.map(([, artist, album]) => [artist, album]),
    ...listSpecs.flatMap(([, , , , albums]) => albums),
  ]);

  const artistMap = new Map();
  const releaseMap = new Map();

  console.log(`Resolviendo ${artistNames.length} artistas y calentando el caché del catálogo…`);

  for (let index = 0; index < artistNames.length; index += 1) {
    const name = artistNames[index];
    process.stdout.write(`[${index + 1}/${artistNames.length}] ${name}… `);
    try {
      const result = await searchCatalog(name, 20, {
        expandArtist: true,
        releaseLimit: 60,
      });
      const exactArtist = result.artists.find(
        (artist) => normalized(artist.name) === normalized(name),
      ) || result.artists[0] || null;
      const exactReleases = (result.releases || []).filter(
        (release) => normalized(release.artist) === normalized(name),
      );
      const ownReleases = exactReleases.length
        ? exactReleases
        : (result.releases || []).filter(
          (release) => normalized(release.artist).includes(normalized(name)),
        );
      const image = ownReleases.find(
        (release) => release.image && !release.image.includes("cover-placeholder"),
      )?.image || "";
      if (exactArtist) {
        artistMap.set(normalized(name), {
          id: exactArtist.catalogId || exactArtist.id,
          catalogId: exactArtist.catalogId || exactArtist.id,
          name,
          image,
        });
      }
      for (const release of ownReleases) {
        releaseMap.set(
          `${normalized(release.artist)}|${normalized(release.album || release.title)}`,
          release,
        );
      }
      console.log(`${ownReleases.length} lanzamientos`);
    } catch (error) {
      console.log(`sin conexión (${error.message})`);
      artistMap.set(normalized(name), {
        id: `demo-${normalized(name).replaceAll(" ", "-")}`,
        catalogId: `demo-${normalized(name).replaceAll(" ", "-")}`,
        name,
        image: "",
      });
    }
  }

  const missingPairs = requestedPairs.filter(([artist, album]) => {
    const exact = `${normalized(artist)}|${normalized(album)}`;
    if (releaseMap.has(exact)) return false;
    return ![...releaseMap.keys()].some((key) => {
      const [storedArtist, storedAlbum] = key.split("|");
      return storedArtist.includes(normalized(artist)) && storedAlbum === normalized(album);
    });
  });

  console.log(`Resolviendo ${missingPairs.length} lanzamientos que no aparecieron en la discografía inicial…`);

  for (let index = 0; index < missingPairs.length; index += 1) {
    const [artist, album] = missingPairs[index];
    process.stdout.write(`[${index + 1}/${missingPairs.length}] ${artist} — ${album}… `);
    try {
      const result = await searchCatalog(`${artist} ${album}`, 12, {
        expandArtist: false,
      });
      const exact = result.releases.find(
        (release) =>
          normalized(release.artist) === normalized(artist) &&
          normalized(release.album || release.title) === normalized(album),
      ) || result.releases.find(
        (release) =>
          normalized(release.artist).includes(normalized(artist)) &&
          normalized(release.album || release.title) === normalized(album),
      ) || result.releases.find(
        (release) => normalized(release.artist) === normalized(artist),
      );
      if (exact) {
        releaseMap.set(`${normalized(artist)}|${normalized(album)}`, {
          ...exact,
          album,
          title: album,
          artist,
        });
        console.log("OK");
      } else {
        console.log("se usará una portada de respaldo");
      }
    } catch {
      console.log("se usará una portada de respaldo");
    }
  }

  function releaseFor(artist, album, year = null) {
    const exact = releaseMap.get(`${normalized(artist)}|${normalized(album)}`);
    if (exact) return { ...exact, artist, album, title: album };

    const candidate = [...releaseMap.entries()].find(([key]) => {
      const [storedArtist, storedAlbum] = key.split("|");
      return storedArtist.includes(normalized(artist)) && storedAlbum === normalized(album);
    })?.[1];

    if (candidate) return { ...candidate, artist, album, title: album };
    return fallbackRelease(artist, album, year);
  }

  function artistFor(name) {
    return artistMap.get(normalized(name)) || {
      id: `demo-${normalized(name).replaceAll(" ", "-")}`,
      catalogId: `demo-${normalized(name).replaceAll(" ", "-")}`,
      name,
      image: "",
    };
  }

  return { artistFor, releaseFor };
}

async function insertUsers(db, releaseFor) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = db.collection("usuarios");
  const byHandle = new Map();

  for (let index = 0; index < demoUsers.length; index += 1) {
    const definition = demoUsers[index];
    const document = {
      nombre: definition.nombre,
      handle: definition.handle,
      email: definition.email,
      password,
      rol: "user",
      bio: definition.bio,
      avatar: definition.nombre.slice(0, 1).toUpperCase(),
      avatarImage: definition.avatarImage,
      favoriteArtists: definition.artists,
      top5: definition.top5.map(([artist, album]) => releaseFor(artist, album)),
      provider: "email",
      notificationSettings: { followedUserPosts: index % 3 === 0 },
      createdAt: dateAgo(120 - index * 4, index % 5),
      updatedAt: null,
      seedTag: SEED_TAG,
    };
    const result = await users.insertOne(document);
    byHandle.set(definition.handle, { ...document, _id: result.insertedId });
  }

  return byHandle;
}

async function findDavid(db) {
  return db.collection("usuarios").findOne({
    $and: [
      { rol: { $ne: "admin" } },
      {
        $or: [
          { handle: { $regex: "^david\\.mno$", $options: "i" } },
          { handle: { $regex: "^david", $options: "i" } },
          { nombre: { $regex: "^david", $options: "i" } },
        ],
      },
    ],
  });
}

async function insertFollows(db, usersByHandle, david) {
  const documents = [];
  const handles = [...usersByHandle.keys()];
  const seen = new Set();

  function add(followerId, targetId, days) {
    if (!followerId || !targetId || idString(followerId) === idString(targetId)) return;
    const key = `${idString(followerId)}|${idString(targetId)}`;
    if (seen.has(key)) return;
    seen.add(key);
    documents.push({
      followerId: idString(followerId),
      targetId: idString(targetId),
      createdAt: dateAgo(days),
      seedTag: SEED_TAG,
    });
  }

  handles.forEach((handle, index) => {
    const source = usersByHandle.get(handle);
    add(source._id, usersByHandle.get(handles[(index + 1) % handles.length])._id, 38 - (index % 8));
    add(source._id, usersByHandle.get(handles[(index + 3) % handles.length])._id, 31 - (index % 7));
    if (index % 2 === 0) {
      add(source._id, usersByHandle.get(handles[(index + 7) % handles.length])._id, 23 - (index % 5));
    }
  });

  if (david) {
    ["lucia.sonora", "tomas.en.loop", "vale.popnotes", "marti.entrelineas", "cami.lado.b", "paula.rebobina", "rena.hifi"]
      .forEach((handle, index) => add(david._id, usersByHandle.get(handle)?._id, 18 - index));
    ["lucia.sonora", "vale.popnotes", "julian.afterhours", "emi.cassettes", "nico.enestereo"]
      .forEach((handle, index) => add(usersByHandle.get(handle)?._id, david._id, 15 - index));
  }

  if (documents.length) {
    for (const document of documents) {
      await db.collection("follows").updateOne(
        { followerId: document.followerId, targetId: document.targetId },
        { $setOnInsert: document },
        { upsert: true },
      );
    }
  }

  return documents;
}

async function insertArtistFollows(db, usersByHandle, david, artistFor) {
  let inserted = 0;

  async function add(userId, artistName, days, tagOnlyOnInsert = true) {
    const artist = artistFor(artistName);
    const artistId = idString(artist.catalogId || artist.id);
    if (!userId || !artistId) return;
    const document = {
      userId: idString(userId),
      artistId,
      artist,
      createdAt: dateAgo(days),
      updatedAt: dateAgo(Math.max(0, days - 1)),
      seedTag: SEED_TAG,
    };
    const update = tagOnlyOnInsert
      ? { $setOnInsert: document }
      : { $set: document };
    const result = await db.collection("artist_follows").updateOne(
      { userId: idString(userId), artistId },
      update,
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
  }

  for (const definition of demoUsers) {
    const user = usersByHandle.get(definition.handle);
    for (let index = 0; index < definition.artists.length; index += 1) {
      await add(user._id, definition.artists[index], 40 - index - demoUsers.indexOf(definition), false);
    }
  }

  if (david) {
    for (let index = 0; index < davidArtistNames.length; index += 1) {
      await add(david._id, davidArtistNames[index], 28 - (index % 14), true);
    }
  }

  return inserted;
}

async function insertReviews(db, usersByHandle, releaseFor) {
  const documents = reviewSpecs.map((spec, index) => {
    const [handle, artist, album, text, rating, significado, momento] = spec;
    const user = usersByHandle.get(handle);
    const release = releaseFor(artist, album);
    return {
      catalogId: release.catalogId || release.id || null,
      artistId: release.artistId || null,
      artist,
      album,
      image: release.image || "",
      text,
      username: user.nombre,
      userId: idString(user._id),
      rating,
      significado,
      momento,
      momentoVisibility: index % 7 === 0 ? "private" : "public",
      releaseType: release.releaseType || "Álbum",
      releaseDate: release.releaseDate || null,
      year: release.year || null,
      createdAt: dateAgo(1 + (index % 31), index % 6, (index * 7) % 60),
      updatedAt: null,
      seedTag: SEED_TAG,
    };
  });

  const result = await db.collection("reviews").insertMany(documents);
  return documents.map((document, index) => ({
    ...document,
    _id: result.insertedIds[index],
  }));
}

async function insertLists(db, usersByHandle, releaseFor) {
  const documents = listSpecs.map((spec, index) => {
    const [handle, title, description, visibility, albums] = spec;
    const user = usersByHandle.get(handle);
    return {
      title,
      description,
      visibility,
      albums: albums.map(([artist, album]) => releaseFor(artist, album)),
      ownerId: idString(user._id),
      ownerName: user.nombre,
      ownerHandle: user.handle,
      owner: user.nombre,
      createdAt: dateAgo(2 + ((index * 3) % 34), index % 4, (index * 11) % 60),
      updatedAt: null,
      seedTag: SEED_TAG,
    };
  });

  const result = await db.collection("lists").insertMany(documents);
  return documents.map((document, index) => ({
    ...document,
    _id: result.insertedIds[index],
  }));
}

async function insertToReview(db, usersByHandle, releaseFor) {
  const candidates = [
    ["lucia.sonora", "Ariana Grande", "Eternal Sunshine"],
    ["lucia.sonora", "Olivia Dean", "Messy"],
    ["tomas.en.loop", "Björk", "Vespertine"],
    ["tomas.en.loop", "Tennis", "Yours Conditionally"],
    ["vale.popnotes", "Sabrina Carpenter", "Short n' Sweet"],
    ["marti.entrelineas", "Victoria Monét", "JAGUAR II"],
    ["julian.afterhours", "Robyn", "Body Talk"],
    ["cami.lado.b", "Agnes", "Magic Still Exists"],
    ["bruno.sintesis", "Tinashe", "333"],
    ["emi.cassettes", "FLO", "Access All Areas"],
    ["rena.hifi", "Laufey", "Bewitched"],
    ["mateo.radar", "Jungle", "Loving in Stereo"],
    ["paula.rebobina", "Zara Larsson", "Venus"],
    ["nico.enestereo", "Tame Impala", "The Slow Rush"],
  ];

  const documents = candidates.map(([handle, artist, album], index) => {
    const user = usersByHandle.get(handle);
    const release = releaseFor(artist, album);
    const key = releaseKey(release);
    return {
      userId: idString(user._id),
      releaseKey: key,
      release,
      createdAt: dateAgo(1 + (index % 12)),
      seedTag: SEED_TAG,
    };
  });

  if (documents.length) await db.collection("to_review").insertMany(documents);
  return documents;
}

async function insertInteractions(db, usersByHandle, reviews, lists, david) {
  const users = [...usersByHandle.values()];
  const comments = [];
  const resonances = [];
  const notifications = [];
  const resonanceKeys = new Set();

  function addResonance(userId, targetType, targetId, authorId, createdAt) {
    if (!userId || !targetId || idString(userId) === idString(authorId)) return;
    const key = `${idString(userId)}|${targetType}|${idString(targetId)}`;
    if (resonanceKeys.has(key)) return;
    resonanceKeys.add(key);
    resonances.push({
      userId: idString(userId),
      targetType,
      targetId: idString(targetId),
      createdAt,
      seedTag: SEED_TAG,
    });
    notifications.push({
      recipientId: idString(authorId),
      actorId: idString(userId),
      type: targetType === "comment" ? "comment_resonance" : "resonance",
      targetType,
      targetId: idString(targetId),
      text: "",
      read: notifications.length % 4 === 0,
      createdAt,
      seedTag: SEED_TAG,
    });
  }

  for (let index = 0; index < reviews.length; index += 1) {
    const review = reviews[index];
    const ownerId = review.userId;
    const commenters = [
      users[(index + 2) % users.length],
      users[(index + 5) % users.length],
    ].filter((user) => idString(user._id) !== ownerId);

    const numberOfComments = index % 3 === 0 ? 2 : 1;
    for (let position = 0; position < numberOfComments; position += 1) {
      const commenter = commenters[position];
      if (!commenter) continue;
      const comment = {
        _id: new ObjectId(),
        userId: idString(commenter._id),
        targetType: "review",
        targetId: idString(review._id),
        text: commentTexts[(index + position * 3) % commentTexts.length],
        createdAt: new Date(new Date(review.createdAt).getTime() + (position + 1) * 55 * 60 * 1000),
        seedTag: SEED_TAG,
      };
      comments.push(comment);
      notifications.push({
        recipientId: ownerId,
        actorId: idString(commenter._id),
        type: "comment",
        targetType: "review",
        targetId: idString(review._id),
        text: comment.text.slice(0, 160),
        read: index % 4 === 0,
        createdAt: comment.createdAt,
        seedTag: SEED_TAG,
      });
    }

    const resonanceUsers = [
      users[(index + 1) % users.length],
      users[(index + 4) % users.length],
      users[(index + 8) % users.length],
    ];
    resonanceUsers.forEach((user, position) => addResonance(
      user._id,
      "review",
      review._id,
      ownerId,
      new Date(new Date(review.createdAt).getTime() + (position + 2) * 75 * 60 * 1000),
    ));

    if (david && index % 5 === 0) {
      addResonance(
        david._id,
        "review",
        review._id,
        ownerId,
        new Date(new Date(review.createdAt).getTime() + 5 * 60 * 60 * 1000),
      );
    }
  }

  for (let index = 0; index < lists.length; index += 1) {
    const list = lists[index];
    if (list.visibility === "private") continue;
    const ownerId = list.ownerId;
    const commenters = [users[(index + 3) % users.length], users[(index + 8) % users.length]]
      .filter((user) => idString(user._id) !== ownerId);
    const numberOfComments = index % 2 === 0 ? 2 : 1;

    for (let position = 0; position < numberOfComments; position += 1) {
      const commenter = commenters[position];
      if (!commenter) continue;
      const comment = {
        _id: new ObjectId(),
        userId: idString(commenter._id),
        targetType: "list",
        targetId: idString(list._id),
        text: listCommentTexts[(index + position) % listCommentTexts.length],
        createdAt: new Date(new Date(list.createdAt).getTime() + (position + 1) * 80 * 60 * 1000),
        seedTag: SEED_TAG,
      };
      comments.push(comment);
      notifications.push({
        recipientId: ownerId,
        actorId: idString(commenter._id),
        type: "comment",
        targetType: "list",
        targetId: idString(list._id),
        text: comment.text.slice(0, 160),
        read: index % 3 === 0,
        createdAt: comment.createdAt,
        seedTag: SEED_TAG,
      });
    }

    [users[(index + 2) % users.length], users[(index + 6) % users.length]]
      .forEach((user, position) => addResonance(
        user._id,
        "list",
        list._id,
        ownerId,
        new Date(new Date(list.createdAt).getTime() + (position + 2) * 90 * 60 * 1000),
      ));
  }

  for (let index = 0; index < comments.length; index += 1) {
    if (index % 2 !== 0) continue;
    const comment = comments[index];
    const user = users[(index + 7) % users.length];
    addResonance(
      user._id,
      "comment",
      comment._id,
      comment.userId,
      new Date(new Date(comment.createdAt).getTime() + 35 * 60 * 1000),
    );
  }

  if (comments.length) await db.collection("comments").insertMany(comments);
  if (resonances.length) await db.collection("resonances").insertMany(resonances);
  if (notifications.length) await db.collection("notifications").insertMany(notifications);

  return { comments, resonances, notifications };
}

async function insertFollowNotifications(db, followDocuments) {
  const notifications = followDocuments
    .filter((document, index) => index % 2 === 0)
    .map((document, index) => ({
      recipientId: document.targetId,
      actorId: document.followerId,
      type: "follow",
      targetType: null,
      targetId: null,
      text: "",
      read: index % 3 === 0,
      createdAt: document.createdAt,
      seedTag: SEED_TAG,
    }));
  if (notifications.length) await db.collection("notifications").insertMany(notifications);
  return notifications;
}

async function run() {
  if (!process.env.DB_URL || !process.env.DB_NAME) {
    throw new Error("Faltan DB_URL o DB_NAME en back/.env.");
  }

  const db = await getDb();
  console.log(`Base seleccionada: ${process.env.DB_NAME}`);
  console.log(`Limpiando una ejecución anterior de ${SEED_TAG}…`);
  await cleanPreviousSeed(db);

  if (RESET_ONLY) {
    console.log("Contenido demo eliminado. David, admin y el contenido real no fueron modificados.");
    return;
  }

  const { artistFor, releaseFor } = await resolveCatalog();
  const usersByHandle = await insertUsers(db, releaseFor);
  const david = await findDavid(db);
  const followDocuments = await insertFollows(db, usersByHandle, david);
  const artistFollowCount = await insertArtistFollows(db, usersByHandle, david, artistFor);
  const reviews = await insertReviews(db, usersByHandle, releaseFor);
  const lists = await insertLists(db, usersByHandle, releaseFor);
  const toReview = await insertToReview(db, usersByHandle, releaseFor);
  const interactions = await insertInteractions(db, usersByHandle, reviews, lists, david);
  const followNotifications = await insertFollowNotifications(db, followDocuments);

  console.log("\nSeed abundante terminado:");
  console.log(`- ${usersByHandle.size} usuarios demo`);
  console.log(`- ${reviews.length} reseñas`);
  console.log(`- ${lists.length} listas (${lists.filter((list) => list.visibility === "public").length} públicas)`);
  console.log(`- ${followDocuments.length} vínculos entre usuarios`);
  console.log(`- ${artistFollowCount} seguimientos de artistas nuevos`);
  console.log(`- ${toReview.length} lanzamientos en Por reseñar`);
  console.log(`- ${interactions.comments.length} comentarios`);
  console.log(`- ${interactions.resonances.length} resonancias`);
  console.log(`- ${interactions.notifications.length + followNotifications.length} notificaciones`);
  console.log(`- Contraseña de todos los usuarios demo: ${DEMO_PASSWORD}`);
  console.log(david
    ? `- David encontrado como @${david.handle}: se agregaron seguimientos sociales y los ${davidArtistNames.length} artistas solicitados sin editar su perfil.`
    : "- No encontré a David automáticamente; el resto del contenido fue creado normalmente.");
  console.log("\nPara borrar únicamente este contenido demo: node seed-demo-rich.js --reset");
}

try {
  await run();
} catch (error) {
  console.error("\nNo se pudo completar el seed:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
