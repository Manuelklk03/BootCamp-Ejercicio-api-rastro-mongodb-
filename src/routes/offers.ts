import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Offer } from "../types";
import { listingsCollection, offersCollection, usersCollection } from "../db";

const router = Router();

router.post("/", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { listingId, buyerId, amount } = body;

  if (
    typeof listingId !== "string" || !ObjectId.isValid(listingId) ||
    typeof buyerId !== "string" || !ObjectId.isValid(buyerId)
  ) {
    res.status(400).json({ error: "listingId y buyerId deben tener formato de ObjectId" });
    return;
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "amount tiene que ser un número mayor que 0" });
    return;
  }

  const listing = await listingsCollection().findOne({ _id: new ObjectId(listingId) });
  if (!listing) {
    res.status(400).json({ error: "No existe ningún anuncio con ese listingId" });
    return;
  }

  const buyer = await usersCollection().findOne({ _id: new ObjectId(buyerId) });
  if (!buyer) {
    res.status(400).json({ error: "No existe ningún usuario con ese buyerId" });
    return;
  }

  if (listing.status !== "AVAILABLE") {
    res.status(409).json({ error: "El anuncio no está disponible para recibir ofertas" });
    return;
  }

  const offer: Offer = {
    amount,
    status: "PENDING",
    createdAt: new Date(),
    listing: { id: listing._id, title: listing.title, price: listing.price },
    buyer: { id: buyer._id, name: buyer.name },
  };

  const result = await offersCollection().insertOne(offer);
  res.status(201).json({ ...offer, _id: result.insertedId });
});

export default router;
