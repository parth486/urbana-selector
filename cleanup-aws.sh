#!/bin/bash

# cleanup-aws-sdk.sh (v3 - FINAL, CORRECTED)

echo "Slimming down the AWS SDK for PHP..."

SDK_SRC_DIR="vendor/aws/aws-sdk-php/src"

# --- Step 1: Clean up unused service source code ---
echo "Cleaning up service source directories..."
find "$SDK_SRC_DIR" -maxdepth 1 -type d | while read -r SERVICE_DIR; do
  SERVICE_NAME=$(basename "$SERVICE_DIR")
  case "$SERVICE_NAME" in
    # Directories to KEEP
    S3|Credentials|SignatureV4|Endpoint|Exception|Api|Input|Result|Multipart|data)
      echo "  Keeping: $SERVICE_NAME"
      ;;
    # Otherwise, DELETE it
    *)
      if [ "$SERVICE_NAME" != "src" ]; then
        echo "  Removing source: $SERVICE_NAME"
        rm -rf "$SERVICE_DIR"
      fi
      ;;
  esac
done

# --- Step 2: Clean up the massive 'data' directory ---
SDK_DATA_DIR="$SDK_SRC_DIR/data"
echo "Cleaning up service API models in '$SDK_DATA_DIR'..."
find "$SDK_DATA_DIR" -maxdepth 1 -type d | while read -r MODEL_DIR; do
  MODEL_NAME=$(basename "$MODEL_DIR")
  case "$MODEL_NAME" in
    # Data models to KEEP. 'data' is the parent folder itself.
    s3|data)
      echo "  Keeping data model: $MODEL_NAME"
      ;;
    # Otherwise, DELETE it
    *)
      echo "  Removing data model: $MODEL_NAME"
      rm -rf "$MODEL_DIR"
      ;;
  esac
done

echo "AWS SDK cleanup complete! 🙏"