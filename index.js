require("dotenv").config();
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const File = require("./model/file");
const express = require("express");
const path = require("path");
const app = express();

app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

mongoose.connect(process.env.DATABASE_URL, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  // serverSelectionTimeoutMS: 240000, // Increase the timeout (30 seconds in this example)
});

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileDetails = new File({
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    uuid: req.body.uuid,
  });
  if (req.body.password !== null && req.body.password !== "") {
    fileDetails.password = await bcrypt.hash(req.body.password, 10);
  }
  const file = await File.create(fileDetails);

  res.render("index", {
    fileLink: `${req.headers.origin}/file/${file.id}`,
  });
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  if (file.password != null) {
    if (req.body.password == null) {
      res.render("password");
      return;
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("password", { error: true });
      return;
    }
  }
  res.download(file.path, file.originalName);
}

app.listen(process.env.PORT, () => console.log("server is working.."));
