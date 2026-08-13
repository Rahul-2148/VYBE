import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { createOrUpdateNote, getActiveNotes, deleteNote } from "../controllers/note.controller.js";

const noteRouter = express.Router();

noteRouter.post("/", isAuthenticated, createOrUpdateNote);
noteRouter.get("/", isAuthenticated, getActiveNotes);
noteRouter.delete("/", isAuthenticated, deleteNote);

export default noteRouter;
