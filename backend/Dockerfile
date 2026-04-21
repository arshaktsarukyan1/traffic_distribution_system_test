FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       git \
       unzip \
       libsqlite3-dev \
       default-libmysqlclient-dev \
    && docker-php-ext-install pdo pdo_mysql pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
