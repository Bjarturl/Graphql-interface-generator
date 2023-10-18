import { buildSchema } from "graphql";
import {
  generatePrismicSchema,
  prismicGraphqlExecuteFn,
  graphqlExecuteFn,
  getGraphqlSchemaFromUrl,
} from "./helpers.js";
import inMemoryDB from "./db.js";


export const prismicRepositoryHandler = async (req, res) => {
  const { repositoryName, accessToken, overwrite } = req.body;

  if (!repositoryName)
    return res.status(400).send("Invalid or missing repository name.");

  try {
    const schemaIndex = inMemoryDB.prismicSchemas.findIndex(schema => schema.repository_name === repositoryName);
    if (schemaIndex !== -1 && !overwrite) {
      return res.status(200).send("Schema already exists in database.");
    }
    const { ref, schema } = await generatePrismicSchema(repositoryName);
    if (schemaIndex !== -1 && overwrite) {
      inMemoryDB.prismicSchemas[schemaIndex] = {
        repository_name: repositoryName,
        schema_content: schema,
        access_token: accessToken,
        master_ref: ref
      };
    } else if (schemaIndex === -1) {
      inMemoryDB.prismicSchemas.push({
        repository_name: repositoryName,
        schema_content: schema,
        access_token: accessToken,
        master_ref: ref
      });
    }
    return res.status(200).send("Schema processed successfully.");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error.");
  }
};

export const graphqlRouteHandler = async (req) => {
  const url = req.query.url;
  if (!url) throw new Error("No URL specified");

  const schema = inMemoryDB.schemas.find(s => s.url === url);
  const prismicSchema = inMemoryDB.prismicSchemas.find(s => s.repository_name === url);
  

  if (!schema && !prismicSchema) {
    throw new Error("Schema not found for the specified URL");
  }

  const data = prismicSchema || schema;

  return {
    schema: buildSchema(data.schema_content),
    graphiql: true,
    customExecuteFn: !schema
      ? async () =>
          prismicGraphqlExecuteFn(
            data.repository_name,
            data.master_ref,
            data.access_token,
            req.body.query
          )
      : async () => graphqlExecuteFn(url, data.auth_header, req.body.query),
  };
};


export const graphqlUrlHandler = async (req, res) => {
  const { url, overwrite, Authorization = "" } = req.body;

  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return res.status(400).send("Invalid URL format.");
  }

  try {
    const schemaIndex = inMemoryDB.schemas.findIndex(schema => schema.url === url);
    if (schemaIndex !== -1 && !overwrite) {
      return res.status(200).send("Schema already exists in database.");
    }

    const headers = {}
    if(Authorization) {
      headers["Authorization"] = Authorization
    }
    const sdl = await getGraphqlSchemaFromUrl(url, headers);
    if (schemaIndex !== -1 && overwrite) {
      inMemoryDB.schemas[schemaIndex] = {
        url: url,
        schema_content: sdl,
        auth_header: Authorization
      };
    } else if (schemaIndex === -1) {
      inMemoryDB.schemas.push({
        url: url,
        schema_content: sdl,
        auth_header: Authorization
      });
    }
    return res.status(200).send("Schema processed successfully.");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error.");
  }
};

