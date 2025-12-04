#!/bin/bash
cd /home/kavia/workspace/code-generation/social-identity-finder-219433-219442/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

