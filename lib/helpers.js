
import { INTROSPECTION_QUERY, __dirname, __filename } from "./constants.js";
import { printSchema, buildClientSchema } from "graphql/utilities/index.js";
import fetch from "isomorphic-fetch";

// Schema generating functions

export async function getGraphqlSchemaFromUrl(
  url,
  headers = {},
  method = "POST"
) {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (method === "POST") {
    config.body = JSON.stringify({ query: INTROSPECTION_QUERY });
  }
  const responseJson = await fetchJson(
    method === "POST" ? url : `${url}?query=${INTROSPECTION_QUERY}`,
    config
  );
  const sdl = convertJsonToSdl(responseJson).replace(/Json/gm, "JSON");
  return sdl;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${url}. Status: ${response.status}`);
  }
  return response.json();
}

function convertJsonToSdl(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON object received");
  }

  if (raw.errors) {
    throw new Error(
      `Errors received from GraphQL endpoint: ${JSON.stringify(
        raw.errors,
        null,
        2
      )}`
    );
  }

  const schemaData = raw.data;
  if (!schemaData || !schemaData.__schema) {
    throw new Error('No "data" or "__schema" key found in JSON object');
  }

  const schema = buildClientSchema(schemaData);
  return printSchema(schema);
}

export async function generatePrismicSchema(repositoryName) {
  try {
    const apiUrl = `https://${repositoryName}.prismic.io/api`;
    const gqlUrl = `https://${repositoryName}.prismic.io/graphql`;

    const { refs } = await fetchJson(apiUrl);
    const masterRef = refs.find((ref) => ref.isMasterRef);

    if (!masterRef) {
      throw new Error("Failed to find the master reference from Prismic.");
    }

    const headers = {
      "Prismic-ref": masterRef.ref,
    };

    const sdl = await getGraphqlSchemaFromUrl(gqlUrl, headers, "GET");

    return { ref: masterRef.ref, schema: sdl };
  } catch (err) {
    console.error("Error generating Prismic schema:", err);
    throw err;
  }
}

// Querying functions 

export async function graphqlExecuteFn(endpoint, authorization, query) {
  try {
    const headers = { "Content-Type": "application/json" }
    if(authorization) {
      headers.Authorization = authorization
    }
    const responseJson = await fetchJson(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
    return responseJson;
  } catch (err) {
    console.error("Error forwarding request:", err);
    throw new Error("Error forwarding request to target GraphQL endpoint.");
  }
}

export const prismicGraphqlExecuteFn = async (
  repositoryName,
  ref,
  accessToken,
  query
) => {
  const endpoint = `https://${repositoryName}.cdn.prismic.io/graphql?query=${encodeURIComponent(
    query
  )}`;
  try {
    const responseJson = await fetchJson(endpoint, {
      method: "GET",
      headers: {
        "prismic-ref": ref,
        authorization: accessToken,
      },
    });
    return responseJson;
  } catch (err) {
    console.error("Error forwarding request:", err);
    throw new Error("Error forwarding request to target GraphQL endpoint.");
  }
};
