FROM minio/mc:RELEASE.2025-08-13T08-35-41Z AS minio-client

FROM alpine:3.20

RUN apk add --no-cache ca-certificates coreutils findutils

COPY --from=minio-client /usr/bin/mc /usr/local/bin/mc

ENTRYPOINT ["/bin/sh"]
