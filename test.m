x = spectrum(:,2);
y = spectrum(:,1);
plot(x,y);
z = zeros(301,1);
for k = 1:1:301
    for j = 1:1:10
       z(k) = z(k)+y(10*(k-1)+j); 
    end
    z(k) = z(k)/10;
end
