const { graphqlSync, GraphQLEnumType, GraphQLObjectType, GraphQLSchema } = require("graphql");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { TransformEnumValues } = require("@graphql-tools/wrap");

const ONE = 1;

// Arbitrary enum with explicit values
const EnumType = new GraphQLEnumType({
  name: "Enum",
  values: { ONE: { value: ONE } },
});

// Arbitrary object type with an enum field
const ObjectType = new GraphQLObjectType({
  name: "Object",
  fields: { value: { type: EnumType } },
});

// Trivial sub-schema with an ObjectType field
const subSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: { object: { type: ObjectType } },
  }),
});

// Transforms an enum to its internal value
const enumValueTransformer = (typeName, externalValue, enumValueConfig) => {
  return [enumValueConfig.value, enumValueConfig];
};

const transformEnumValues = new TransformEnumValues(enumValueTransformer);
const transforms = [transformEnumValues];

// Transform and discard; this loads schema into the transformer
void transformEnumValues.transformSchema(subSchema);

// Trivial schema which delegates to the sub-schema
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      object: {
        type: ObjectType,
        resolve: (root, args, context, info) => {
          return delegateToSchema({
            schema: subSchema,
            operation: "query",
            fieldName: "object",
            args,
            context,
            info,
            transforms,
          });
        },
      },
    },
  }),
});

// Minimal query
const source = `
  query {
    object {
      value
    }
  }
`;

// Mirrors the shape of the query
const rootValue = {
  object: {
    value: ONE,
  },
};

function execute(schema) {
  return graphqlSync(schema, source, rootValue);
}

function prettyPrint(object) {
  return console.log(JSON.stringify(object, null, 2));
}

prettyPrint(execute(subSchema)); // OK
prettyPrint(execute(schema)); // Error
