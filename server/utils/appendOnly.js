const IMMUTABLE_ERROR =
  "This collection is append-only. Updates and deletions are prohibited.";

export default function appendOnly(schema) {
  const block = function () {
    throw new Error(IMMUTABLE_ERROR);
  };

  schema.pre("updateOne", block);
  schema.pre("updateMany", block);
  schema.pre("findOneAndUpdate", block);
  schema.pre("replaceOne", block);
  schema.pre("deleteOne", block);
  schema.pre("deleteMany", block);
  schema.pre("findOneAndDelete", block);
  schema.pre("findOneAndReplace", block);

  schema.pre("save", function () {
    if (!this.isNew) {
      throw new Error(IMMUTABLE_ERROR);
    }
  });
}
