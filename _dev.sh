#!/bin/sh

export SESSION_TIMEOUT=1
export COUNTER_HISTORY=2
export COUNT_PRE_REQUESTS="true"
gow run src/*.go
