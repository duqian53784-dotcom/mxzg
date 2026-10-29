package com.funsgamex.mxzg.auth;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Creator's local preview only; production channel origins need separate configuration. */
@Configuration
@Profile("local & !production")
public class LocalPreviewConfiguration implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")
            .allowedOrigins("http://localhost:7456", "http://127.0.0.1:7456")
            .allowedMethods("GET", "POST", "PUT", "OPTIONS")
            .allowedHeaders("Content-Type", "Authorization");
    }
}
