FROM golang:alpine AS build-env
RUN apk --no-cache add git
ADD . /build
RUN cd /build/src && go get -v -d ./...
RUN cd /build && go build -v -o gostats src/*.go

# final stage
FROM alpine
RUN apk --no-cache add figlet
WORKDIR /app
COPY --from=build-env /build/gostats /app/
COPY ./public /app/public
EXPOSE 8000
ENTRYPOINT ./gostats