FROM apify/actor-node-chrome:16

# Copy the package.json and package-lock.json files, since they are the only files
# that affect NPM install in the next step
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to keep the
# image small. Avoid logging too much and print the dependency tree for debugging

# Log Node version
RUN echo "Node.js version:" && node --version

# Log npm version
RUN echo "NPM version:" && npm --version

# Install all runtime dependencies
RUN npm --quiet set progress=false \
	&& npm ci --only=prod --no-optional \
	&& echo "Installed NPM packages:" \
	&& (npm ls || true)

# Next, copy the remaining files and directories with the built source code.
# Since we do this after NPM install, quick build will be really fast
# for simple source file changes.
COPY ./src ./dist
