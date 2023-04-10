import express from "express";
import https from "https"
import http from "http"
import path from "path";
import fs from "fs";

import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import PNGtext from "png-chunk-text";
import sharp from "sharp";

const app = express()
const port = 8000
const __dirname = path.resolve("./")

app.get("/", (request, response) => {
    response.send("hello world!")
})

app.listen(port, () => {
    console.log(`File path: ${__dirname}`)
    console.log(`Example app listening on port ${port}`)
})