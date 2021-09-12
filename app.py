import uuid
import json
import time
from tqdm import tqdm

#------------------------------

import tensorflow as tf
tf_version = int(tf.__version__.split(".")[0])

#------------------------------

if tf_version == 2:
	import logging
tf.get_logger().setLevel(logging.ERROR)

#------------------------------

from deepface import DeepFace

#------------------------------


#------------------------------

if tf_version == 1:
	graph = tf.get_default_graph()


def get_body(event):
	body = event['body']
	if isinstance(body, str):
		body = json.loads(body)
		return body

def handler(event, context):
	body = get_body(event)
	trx_id = uuid.uuid4()
	res = analyzeWrapper(body, trx_id)
	response = {
		"statusCode": 200,
		"body": json.dumps(res),
		"headers": {
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "*",
			"Access-Control-Allow-Credentials": True,
		},
	}
	return response
	
def analyzeWrapper(req, trx_id = 0):
	resp_obj = {'success': True}

	instances = []
	if "img" in list(req.keys()):
		raw_content = req["img"] #list

	for item in raw_content: #item is in type of dict
		instances.append(item)

	if len(instances) == 0:
		return {'success': False, 'error': 'you must pass at least one img object in your request'}

	print("Analyzing ", len(instances)," instances")

#---------------------------

	detector_backend = 'opencv'

	actions= ['age', 'gender']

	if "actions" in list(req.keys()):
		actions = req["actions"]

	if "detector_backend" in list(req.keys()):
		detector_backend = req["detector_backend"]

#---------------------------

	try:
		resp_obj = DeepFace.analyze(instances, actions = actions)
	except Exception as err:
		print("Exception: ", str(err))
		return {'success': False, 'error': str(err)}

#---------------
	print(resp_obj)
	return {'success': True, 'data': resp_obj}
