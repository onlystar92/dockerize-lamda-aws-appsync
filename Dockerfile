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

ENV DEEPFACE_HOME ${LAMBDA_TASK_ROOT}

RUN mkdir -p ${LAMBDA_TASK_ROOT}/.deepface/weights

RUN curl -L https://github.com/serengil/deepface_models/releases/download/v1.0/facial_expression_model_weights.h5 -o ${LAMBDA_TASK_ROOT}/.deepface/weights/facial_expression_model_weights.h5
RUN curl -L https://github.com/serengil/deepface_models/releases/download/v1.0/age_model_weights.h5 -o ${LAMBDA_TASK_ROOT}/.deepface/weights/age_model_weights.h5
RUN curl -L https://github.com/serengil/deepface_models/releases/download/v1.0/gender_model_weights.h5 -o ${LAMBDA_TASK_ROOT}/.deepface/weights/gender_model_weights.h5

COPY api/ ${LAMBDA_TASK_ROOT}/api
COPY deepface/ ${LAMBDA_TASK_ROOT}/deepface
COPY setup.py ${LAMBDA_TASK_ROOT}
COPY wsgi.py ${LAMBDA_TASK_ROOT}
COPY .serverless-wsgi ${LAMBDA_TASK_ROOT}
COPY entry.sh ${LAMBDA_TASK_ROOT}
COPY app.py ${LAMBDA_TASK_ROOT}

RUN pip install --target ${LAMBDA_TASK_ROOT} awslambdaric

RUN git config --global advice.detachedHead false
RUN git clone https://github.com/logandk/serverless-wsgi ${LAMBDA_TASK_ROOT}/serverless-wsgi
RUN cp ${LAMBDA_TASK_ROOT}/serverless-wsgi/wsgi_handler.py ${LAMBDA_TASK_ROOT}/wsgi_handler.py && cp ${LAMBDA_TASK_ROOT}/serverless-wsgi/serverless_wsgi.py ${LAMBDA_TASK_ROOT}/serverless_wsgi.py

ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/bin/aws-lambda-rie
RUN chmod 755 /usr/bin/aws-lambda-rie

WORKDIR ${LAMBDA_TASK_ROOT}

RUN chmod +x entry.sh

#ENTRYPOINT [ "./entry.sh" ]
#CMD [ "wsgi_handler.handler" ]
CMD [ "app.handler" ]
