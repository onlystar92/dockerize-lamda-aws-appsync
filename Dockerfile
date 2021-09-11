FROM public.ecr.aws/lambda/python:3.8

RUN yum -y install tar gzip zlib git \
        gcc gcc-c++ \
        zlib-devel \
        sudo \
        mesa-libGL \
        python3-opencv \
        build-essential cmake pkg-config make \
        boost-devel && \
	yum clean all

COPY requirements.txt ./

RUN pip uninstall -y six
RUN python3.8 -m pip install -r requirements.txt

ENV DEEPFACE_HOME /app

RUN mkdir -p /app
RUN mkdir -p /app/.deepface/weights

RUN curl -L https://github.com/serengil/deepface_models/releases/download/v1.0/facial_expression_model_weights.h5 -o /app/.deepface/weights/facial_expression_model_weights.h5
RUN curl -L https://github.com/serengil/deepface_models/releases/download/v1.0/age_model_weights.h5 -o /app/.deepface/weights/age_model_weights.h5
RUN curl -L https://github.com/serengil/deepface_models/releases/download/v1.0/gender_model_weights.h5 -o /app/.deepface/weights/gender_model_weights.h5

COPY api/ /app/api
COPY deepface/ /app/deepface
COPY setup.py /app
COPY wsgi.py /app
COPY .serverless-wsgi /app
COPY entry.sh /app

RUN pip install \
    --target /app \
        awslambdaric

RUN git config --global advice.detachedHead false
RUN git clone https://github.com/logandk/serverless-wsgi /app/serverless-wsgi
RUN cp /app/serverless-wsgi/wsgi_handler.py /app/wsgi_handler.py && cp /app/serverless-wsgi/serverless_wsgi.py /app/serverless_wsgi.py

ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/bin/aws-lambda-rie
RUN chmod 755 /usr/bin/aws-lambda-rie

WORKDIR /app

RUN chmod +x entry.sh

ENTRYPOINT [ "./entry.sh" ]
CMD [ "wsgi_handler.handler" ]
