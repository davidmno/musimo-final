import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.DB_URL);

const demoLists = [
  {
    title: "Verano 2001",
    description: "Discos luminosos, pop y caminatas largas.",
    albums: [
      {
        album: "Fever",
        artist: "Kylie Minogue",
        year: 2001,
        type: "Álbum",
        image: "/images/covers/fever.jpg",
      },
      {
        album: "Light Years",
        artist: "Kylie Minogue",
        year: 2000,
        type: "Álbum",
        image: "/images/covers/light-years.jpg",
      },
      {
        album: "Discovery",
        artist: "Daft Punk",
        year: 2001,
        type: "Álbum",
        image: "/images/covers/discovery.jpg",
      },
    ],
  },
  {
    title: "Discos de madrugada",
    description: "Álbumes para escuchar cuando todo baja un cambio.",
    albums: [
      {
        album: "Kid A",
        artist: "Radiohead",
        year: 2000,
        type: "Álbum",
        image: "/images/covers/kid-a.jpg",
      },
      {
        album: "In Rainbows",
        artist: "Radiohead",
        year: 2007,
        type: "Álbum",
        image: "/images/covers/in-rainbows.jpg",
      },
      {
        album: "The Sea",
        artist: "Corinne Bailey Rae",
        year: 2010,
        type: "Álbum",
        image: "/images/covers/the-sea.jpg",
      },
    ],
  },
  {
    title: "Regreso a casa",
    description: "Canciones y discos que funcionan como refugio.",
    albums: [
      {
        album: "Melodrama",
        artist: "Lorde",
        year: 2017,
        type: "Álbum",
        image: "/images/covers/melodrama.jpg",
      },
      {
        album: "CTRL",
        artist: "SZA",
        year: 2017,
        type: "Álbum",
        image: "/images/covers/ctrl.jpg",
      },
      {
        album: "Channel Orange",
        artist: "Frank Ocean",
        year: 2012,
        type: "Álbum",
        image: "/images/covers/channel-orange.jpg",
      },
    ],
  },
];

async function seedLists() {
  await client.connect();

  const db = client.db(process.env.DB_NAME);
  const lists = db.collection("lists");
  const usuarios = db.collection("usuarios");

  const ownerEmail = (process.env.SEED_OWNER_EMAIL || process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const ownerUser = ownerEmail
    ? await usuarios.findOne({ email: ownerEmail })
    : null;
  const ownerName = ownerUser?.nombre || process.env.SEED_OWNER_NAME || "Usuario demo";
  const ownerId = ownerUser ? String(ownerUser._id) : null;

  for (const list of demoLists) {
    const exists = await lists.findOne({ title: list.title });

    if (!exists) {
      await lists.insertOne({
        ...list,
        ownerId,
        ownerName,
        owner: ownerName,
        visibility: "public",
        createdAt: new Date(),
        updatedAt: null,
      });

      console.log(`Lista creada: ${list.title}`);
    } else {
      console.log(`Lista ya existía: ${list.title}`);
    }
  }

  await client.close();

  console.log("Seed de listas terminado.");
}

seedLists().catch(async (error) => {
  console.error(error);
  await client.close();
});
