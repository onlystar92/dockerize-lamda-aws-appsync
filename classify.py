import base64
from requests_toolbelt.multipart import decoder
import os
import uuid
import json
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()

from model import OpenNsfwModel, InputType
from image_utils import create_tensorflow_image_loader
from image_utils import create_yahoo_image_loader

import numpy as np

model = OpenNsfwModel()
MODEL_WEIGHTS = "data/open_nsfw-weights.npy"
IMAGE_LOADER_TENSORFLOW = "tensorflow"
IMAGE_LOADER_YAHOO = "yahoo"

input_type = InputType[InputType.TENSOR.name.upper()]
model.build(weights_path=MODEL_WEIGHTS, input_type=input_type)

def handler(event, context):
	print(event)
	trx_id = uuid.uuid4()
	input_file = "/tmp/{}.jpg".format(str(trx_id))
	post_data = base64.b64decode(event['body']).decode('iso-8859-1')
	content_type = ""
	if 'Content-Type' in event['headers']:
		content_type = event['headers']['Content-Type']
	else:
		content_type = event['headers']['content-type']

	data = ''
	for part in decoder.MultipartDecoder(post_data.encode('utf-8'), content_type).parts:
		print(part.headers)
		print(b'Content-Type' in part.headers)
		print(b'image' in part.headers[b'Content-Type'])

		if b'Content-Type' in part.headers and b'image' in part.headers[b'Content-Type']:
			data = part.text;
			break;

	if data == '':
		response = {
			"statusCode": 400,
			"body": json.dumps({
				"error": "Empty file"
			}),
			"headers": {
				"Access-Control-Allow-Headers": "Content-Type",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "*",
				"Access-Control-Allow-Credentials": True,
			},
		}

		return response

	try:
		print(data);
		with open(input_file, 'wb') as f:
			f.write(data.encode("iso-8859-1"))

		with tf.Session() as sess:

			fn_load_image = None
			image_loader = "yahoo"

			if input_type == InputType.TENSOR:
				if image_loader == IMAGE_LOADER_TENSORFLOW:
					fn_load_image = create_tensorflow_image_loader(tf.Session(graph=tf.Graph()))
				else:
					fn_load_image = create_yahoo_image_loader()
			elif input_type == InputType.BASE64_JPEG:
				fn_load_image = lambda filename: np.array([base64.urlsafe_b64encode(open(filename, "rb").read())])

			sess.run(tf.global_variables_initializer())

			image = fn_load_image(input_file)

			predictions = \
				sess.run(model.predictions,
						feed_dict={model.input: image})

			print("Results for '{}'".format(input_file))
			print("\tSFW score:\t{}\n\tNSFW score:\t{}".format(*predictions[0]))

			response = {
				"statusCode": 200,
				"body": json.dumps({
					"uuid": str(trx_id),
					"SFW": str(predictions[0][0]),
					"NSFW": str(predictions[0][1])
				}),
				"headers": {
					"Access-Control-Allow-Headers": "Content-Type",
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "*",
					"Access-Control-Allow-Credentials": True,
				},
			}

			os.remove(input_file)

			return response
	except Exception as e:
		response = {
			"statusCode": 400,
			"body": json.dumps({
				"error": str(e)
			}),
			"headers": {
				"Access-Control-Allow-Headers": "Content-Type",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "*",
				"Access-Control-Allow-Credentials": True,
			},
		}

		os.remove(input_file)

		return response
		