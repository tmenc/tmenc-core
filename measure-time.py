import time
import os

start = time.time()
os.system("build/test/test-benchmark.exe")
end = time.time()
print(end - start)

