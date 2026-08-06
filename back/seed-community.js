import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const client = new MongoClient(process.env.DB_URL);

const demoUsers = [
  {
    nombre: "Sofía",
    email: "sofia.demo@musimo.com",
    password: "musimo123",
  },
  {
    nombre: "Lucas",
    email: "lucas.demo@musimo.com",
    password: "musimo123",
  },
  {
    nombre: "Valentina",
    email: "valentina.demo@musimo.com",
    password: "musimo123",
  },
];

const demoReviews = [
  {
    username: "Sofía",
    album: "Blonde",
    artist: "Frank Ocean",
    image: "/images/covers/channel-orange.jpg",
    text: "No lo elegí por tendencia. Lo elegí porque sonaba exactamente como ese verano.",
    rating: 5,
    significado: ["Nostalgia", "Viaje"],
    momento: "Un verano que todavía vuelve cada vez que escucho el disco.",
    releaseType: "Álbum",
    year: 2016,
    createdAt: new Date("2026-06-29T18:30:00"),
  },
  {
    username: "Lucas",
    album: "Melodrama",
    artist: "Lorde",
    image: "/images/covers/melodrama.jpg",
    text: "Todavía no sé si es mi disco favorito, pero sí el que más me devuelve a casa.",
    rating: 5,
    significado: ["Hogar", "Noche"],
    momento: "Volver caminando de madrugada.",
    releaseType: "Álbum",
    year: 2017,
    createdAt: new Date("2026-06-29T17:20:00"),
  },
  {
    username: "Valentina",
    album: "Fever",
    artist: "Kylie Minogue",
    image: "/images/covers/fever.jpg",
    text: "Lo escuché caminando sin rumbo y desde entonces esa calle tiene banda sonora.",
    rating: 4,
    significado: ["Euforia", "Descubrimiento"],
    momento: "Una caminata de noche con auriculares.",
    releaseType: "Álbum",
    year: 2001,
    createdAt: new Date("2026-06-29T16:10:00"),
  },
];

async function seedCommunity() {
  await client.connect();

  const db = client.db(process.env.DB_NAME);
  const usuarios = db.collection("usuarios");
  const reviews = db.collection("reviews");
  const userIdsByName = new Map();

  for (const user of demoUsers) {
    let storedUser = await usuarios.findOne({ email: user.email });

    if (!storedUser) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const newUser = {
        nombre: user.nombre,
        email: user.email,
        password: passwordHash,
        rol: "user",
        handle: user.nombre.toLowerCase().replaceAll(" ", ""),
        bio: "",
        avatar: user.nombre.slice(0, 1).toUpperCase(),
        avatarImage: "",
        favoriteArtists: [],
        followers: 0,
        following: 0,
        top5: [],
        provider: "email",
        notificationSettings: { followedUserPosts: false },
        createdAt: new Date(),
      };

      const result = await usuarios.insertOne(newUser);
      storedUser = { ...newUser, _id: result.insertedId };
      console.log(`Usuario creado: ${user.nombre}`);
    } else {
      console.log(`Usuario ya existía: ${user.nombre}`);
    }

    userIdsByName.set(user.nombre, String(storedUser._id));
  }

  for (const review of demoReviews) {
    const exists = await reviews.findOne({
      username: review.username,
      album: review.album,
      artist: review.artist,
    });

    if (!exists) {
      await reviews.insertOne({
        ...review,
        userId: userIdsByName.get(review.username) || null,
        momentoVisibility: "public",
        updatedAt: null,
      });
      console.log(`Reseña creada: ${review.username} - ${review.album}`);
    } else {
      console.log(`Reseña ya existía: ${review.username} - ${review.album}`);
    }
  }

  console.log("Seed de comunidad terminado.");
}

try {
  await seedCommunity();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.close();
}
