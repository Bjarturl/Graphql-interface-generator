import express from "express";
import { graphqlHTTP } from "express-graphql";

import {
  prismicRepositoryHandler,
  graphqlUrlHandler,
  graphqlRouteHandler,
} from "./lib/handlers.js";
import { __dirname } from "./lib/constants.js";

const app = express();
app.use(express.json());
app.use(express.static('public'))



app.get("/", (_, res) => {
  res.sendFile(__dirname + "/templates/html/index.html");
});

app.post("/set-prismic-repository", prismicRepositoryHandler);
app.post("/set-graphql-url", graphqlUrlHandler);
app.use("/graphql", graphqlHTTP(graphqlRouteHandler));

app.listen(4000);
console.log("Server started at http://localhost:4000");
