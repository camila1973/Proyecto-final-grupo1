ARG BASE_IMAGE=travelhub-base
FROM ${BASE_IMAGE} AS builder
COPY frontend/ ./frontend/
RUN npx nx build frontend --configuration=production

FROM nginx:1.27-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /workspace/dist/frontend/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
