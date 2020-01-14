#!/bin/sh

export SESSION_TIMEOUT=1
export COUNTER_HISTORY=2
export COUNT_PRE_REQUESTS="true"
go get -v -d ./...
gow run src/*.go
