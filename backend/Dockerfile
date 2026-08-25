FROM php:8.4-apache

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libonig-dev \
    libxml2-dev \
    libsqlite3-dev \
    && docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
    && docker-php-ext-install \
        pdo_sqlite \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN printf 'sys_temp_dir = /tmp\n' > /usr/local/etc/php/conf.d/render-temp.ini

RUN mkdir -p bootstrap/cache database storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs \
    && touch database/database.sqlite \
    && chown -R www-data:www-data /var/www/html/bootstrap/cache /var/www/html/storage /var/www/html/database \
    && chmod -R ug+rwX /var/www/html/bootstrap/cache /var/www/html/storage /var/www/html/database \
    && chmod 1777 /tmp



RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' \
    /etc/apache2/sites-available/000-default.conf
RUN sed -i 's/^Listen 80$/Listen 0.0.0.0:80/' /etc/apache2/ports.conf

EXPOSE 80

CMD ["sh", "-c", "(mkdir -p bootstrap/cache database storage/app/private storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs && touch database/database.sqlite && chown -R www-data:www-data bootstrap/cache storage database && chmod -R ug+rwX bootstrap/cache storage database && chmod 1777 /tmp && php artisan migrate --force) > /tmp/laravel-startup.log 2>&1 & exec apache2-foreground"]
